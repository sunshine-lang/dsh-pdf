/**
 * Boundary tests: char cap, page cap, real-world PDF, oversize rejection.
 * Run: node --import tsx/esm scratch-plugin/dsh-pdf/test-bounds.ts
 */
import { readFileSync } from 'node:fs'
import { extractPdf, parsePageSelection } from './src/pdf.ts'

const fixture = (name: string) => new Uint8Array(readFileSync(`./scratch-plugin/dsh-pdf/tests/fixtures/${name}`))
const base = { maxFileBytes: 20 * 1024 * 1024, maxPages: 500, maxCharsPerCall: 12_000 }

// 1. Char cap truncation at page boundary.
const small = await extractPdf(fixture('sample.pdf'), { path: 'x' }, { ...base, maxCharsPerCall: 60 })
console.log('char cap: pages extracted =', small.pages.length, 'truncatedChars =', small.truncatedChars)

// 2. Page cap truncation.
const capped = await extractPdf(fixture('sample.pdf'), { path: 'x' }, { ...base, maxPages: 2 })
console.log('page cap: totalPages =', capped.totalPages, 'parsed =', capped.pages.length, 'truncatedPages =', capped.truncatedPages)

// 3. Real-world PDF (w3.org dummy).
const real = await extractPdf(fixture('w3-dummy.pdf'), { path: 'x' }, base)
console.log('w3 dummy: pages =', real.totalPages, 'page1 =', JSON.stringify(real.pages[0]?.text.slice(0, 60)))

// 4. Oversize rejection happens at the fs layer in production; here verify the page-selection parser.
console.log('parsePageSelection("2-3,5", 6) =', parsePageSelection('2-3,5', 6))
try { parsePageSelection('3-1', 5); console.log('UNEXPECTED') } catch (e) { console.log('descending range rejected:', (e as Error).message) }
try { parsePageSelection('9', 3); console.log('UNEXPECTED') } catch (e) { console.log('out-of-range rejected:', (e as Error).message) }
