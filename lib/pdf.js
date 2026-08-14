/**
 * PDF extraction core for dsh-pdf: parse bytes with pdfjs-dist (official
 * Mozilla PDF.js), extract per-page text and document metadata, bounded by
 * deployment caps. Pure of the harness: takes bytes, returns text.
 * @module pdf
 */
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const require = createRequire(import.meta.url);
/**
 * Resolve pdfjs-dist's bundled standard fonts as a plain filesystem path.
 * pdfjs's Node data factory reads font files with `fs.readFile`, which accepts
 * path strings but not `file://` strings, so the URL form must not be used.
 * @returns the standard_fonts directory with a trailing slash.
 */
function standardFontDataUrl() {
    const packageRoot = require.resolve('pdfjs-dist/package.json').replace(/\/package\.json$/, '');
    return `${packageRoot}/standard_fonts/`;
}
/**
 * Parse `pages` like "1-3,5" into a sorted, de-duplicated 1-based page list.
 * Empty or invalid selections throw, so the caller fails loud instead of
 * silently reading nothing.
 * @param spec - the raw pages parameter; undefined or "all" means every page.
 * @param total - the document's page count, for clamping.
 * @returns the selected page numbers, ascending and within [1, total].
 */
export function parsePageSelection(spec, total) {
    if (spec === undefined || spec.trim() === '' || spec.trim() === 'all') {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const selected = new Set();
    for (const part of spec.split(',')) {
        const trimmed = part.trim();
        const match = /^(\d+)(?:-(\d+))?$/.exec(trimmed);
        if (match === null)
            throw new Error(`invalid pages spec ${JSON.stringify(spec)}: expected like "1-3,5" or "all"`);
        const start = Number(match[1]);
        const end = match[2] === undefined ? start : Number(match[2]);
        if (start < 1 || end < start)
            throw new Error(`invalid page range ${JSON.stringify(trimmed)}: pages are 1-based and ascending`);
        for (let page = start; page <= end; page++)
            selected.add(page);
    }
    const pages = [...selected].filter(page => page <= total).sort((a, b) => a - b);
    if (pages.length === 0)
        throw new Error(`pages ${JSON.stringify(spec)} selects no page within 1..${total}`);
    return pages;
}
/**
 * Extract bounded per-page text from PDF bytes. Each page's text items are
 * joined with spaces; the output truncates at a page boundary when
 * `maxCharsPerCall` is exceeded, and parsing stops at `maxPages`.
 * @param bytes - the raw PDF content.
 * @param params - the tool-facing selection.
 * @param config - the deployment bounds.
 * @returns the bounded extraction.
 */
export async function extractPdf(bytes, params, config) {
    // pdfjs rejects Buffer (a Uint8Array subclass); copy into a plain view when
    // the fs backend handed us one.
    const plainBytes = Buffer.isBuffer(bytes) ? new Uint8Array(bytes) : bytes;
    const task = getDocument({ data: plainBytes, standardFontDataUrl: standardFontDataUrl() });
    const doc = await task.promise;
    try {
        const totalPages = doc.numPages;
        const metadata = await doc.getMetadata();
        const info = metadata.info;
        const title = typeof info?.Title === 'string' && info.Title !== '' ? info.Title : undefined;
        const capped = totalPages > config.maxPages;
        const available = Math.min(totalPages, config.maxPages);
        const selected = parsePageSelection(params.pages, available);
        const pages = [];
        let chars = 0;
        let truncatedChars = false;
        for (const pageNumber of selected) {
            const page = await doc.getPage(pageNumber);
            const content = await page.getTextContent();
            const text = content.items
                .map(item => ('str' in item ? item.str : ''))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (chars + text.length > config.maxCharsPerCall) {
                truncatedChars = true;
                break;
            }
            pages.push({ page: pageNumber, text });
            chars += text.length;
        }
        return { totalPages, title, pages, truncatedPages: capped, truncatedChars };
    }
    finally {
        await task.destroy();
    }
}
