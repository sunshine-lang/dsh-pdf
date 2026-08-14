import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "dsh-pdf";
export declare const inject: string[];
/** Deployment-tunable PDF extraction bounds. */
export interface Config {
    /** Inclusive byte cap on the whole PDF; larger files fail with a loud error. */
    maxFileBytes: number;
    /** Maximum number of pages parsed in one call; larger documents truncate with a notice. */
    maxPages: number;
    /** Maximum characters returned by one call; the result truncates at a page boundary. */
    maxCharsPerCall: number;
}
/** Schemastery configuration: validates on load and fills defaults. */
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
