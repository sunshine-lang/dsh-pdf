/**
 * PDF extraction core for dsh-pdf: parse bytes with pdfjs-dist (official
 * Mozilla PDF.js), extract per-page text and document metadata, bounded by
 * deployment caps. Pure of the harness: takes bytes, returns text.
 * @module pdf
 */
/** Deployment-tunable extraction bounds (the plugin Config). */
export interface PdfConfig {
    /** Inclusive byte cap on the whole PDF; larger files fail with a loud error. */
    maxFileBytes: number;
    /** Maximum number of pages parsed in one call; larger documents truncate with a notice. */
    maxPages: number;
    /** Maximum characters returned by one call; the result truncates at a page boundary. */
    maxCharsPerCall: number;
}
/** Tool-facing parameters for a PDF read. */
export interface PdfParams {
    /** Path to the PDF file, relative paths resolve against the workspace. */
    path: string;
    /** Page selection, e.g. "1-3,5" or "all" (default "all", bounded by maxPages). */
    pages?: string;
}
/** One extracted page. */
export interface ExtractedPage {
    page: number;
    text: string;
}
/** The bounded extraction result. */
export interface PdfExtraction {
    /** Total pages in the document (before any cap). */
    totalPages: number;
    /** Document title, when the PDF declares one. */
    title?: string;
    /** Extracted pages in ascending order. */
    pages: ExtractedPage[];
    /** Whether the document exceeded `maxPages` and parsing stopped early. */
    truncatedPages: boolean;
    /** Whether the output hit `maxCharsPerCall` and stopped at a page boundary. */
    truncatedChars: boolean;
}
/**
 * Parse `pages` like "1-3,5" into a sorted, de-duplicated 1-based page list.
 * Empty or invalid selections throw, so the caller fails loud instead of
 * silently reading nothing.
 * @param spec - the raw pages parameter; undefined or "all" means every page.
 * @param total - the document's page count, for clamping.
 * @returns the selected page numbers, ascending and within [1, total].
 */
export declare function parsePageSelection(spec: string | undefined, total: number): number[];
/**
 * Extract bounded per-page text from PDF bytes. Each page's text items are
 * joined with spaces; the output truncates at a page boundary when
 * `maxCharsPerCall` is exceeded, and parsing stops at `maxPages`.
 * @param bytes - the raw PDF content.
 * @param params - the tool-facing selection.
 * @param config - the deployment bounds.
 * @returns the bounded extraction.
 */
export declare function extractPdf(bytes: Uint8Array, params: PdfParams, config: PdfConfig): Promise<PdfExtraction>;
