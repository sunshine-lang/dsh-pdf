import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { extractPdf } from './pdf.js';
export const name = 'dsh-pdf';
export const inject = ['tools', 'fs'];
/** Schemastery configuration: validates on load and fills defaults. */
export const Config = z.object({
    maxFileBytes: z.natural().min(1).default(20 * 1024 * 1024),
    maxPages: z.natural().min(1).default(500),
    maxCharsPerCall: z.natural().min(1).default(12_000),
});
/** Render one extraction as model-facing text, with page markers and truncation notices. */
function renderExtraction(extraction, displayPath) {
    const lines = [];
    lines.push(`PDF: ${extraction.title ?? displayPath}`);
    lines.push(`Total pages: ${extraction.totalPages}`);
    for (const page of extraction.pages) {
        lines.push(`--- page ${page.page} ---`);
        lines.push(page.text);
    }
    if (extraction.truncatedPages) {
        lines.push(`[note: document has ${extraction.totalPages} pages; parsed only the first ${extraction.pages.length} (maxPages). Use pages="N" to continue.]`);
    }
    if (extraction.truncatedChars) {
        lines.push('[note: output reached the per-call character limit and stopped at a page boundary; use pages="N-M" to continue.]');
    }
    return lines.join('\n');
}
export function apply(ctx, config) {
    // Required dependencies (tools, filesystem) are ready before apply runs.
    console.log('[dsh-pdf] plugin loaded!');
    const pdfConfig = {
        maxFileBytes: config.maxFileBytes,
        maxPages: config.maxPages,
        maxCharsPerCall: config.maxCharsPerCall,
    };
    ctx.tools.register(defineTool({
        name: 'pdf_read',
        description: 'Extract text from a PDF file: per-page text and document metadata. Use pages like "1-3,5" to read a range, or "all". Results are bounded per call; continue with a page range for large documents.',
        parameters: {
            path: { type: 'string', required: true, description: 'Path to the PDF file' },
            pages: {
                type: 'string',
                description: 'Page selection like "1-3,5" or "all" (default "all", bounded by the configured max pages)',
            },
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute(args, exec) {
            const fs = ctx.fs;
            if (typeof fs.readBytes !== 'function') {
                throw new Error('the mounted filesystem backend does not support binary reads (readBytes); upgrade the harness filesystem capability');
            }
            const target = await fs.resolve(args.path, { signal: exec.signal });
            const info = await fs.stat(target, exec.signal);
            if (info === undefined)
                throw new Error(`file not found: ${args.path}`);
            if (info.size !== undefined && info.size > pdfConfig.maxFileBytes) {
                throw new Error(`file ${args.path} is ${info.size} bytes, above the ${pdfConfig.maxFileBytes}-byte limit (maxFileBytes)`);
            }
            const bytes = await fs.readBytes(target, exec.signal, pdfConfig.maxFileBytes);
            const extraction = await extractPdf(bytes, args, pdfConfig);
            return renderExtraction(extraction, target.displayPath ?? args.path);
        },
    }));
}
