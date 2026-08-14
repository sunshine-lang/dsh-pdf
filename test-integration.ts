/**
 * Integration test for dsh-pdf inside the real harness context:
 * mounts the filesystem backend + tool registry + the plugin, then runs the
 * registered tool's execute against the fixture PDF (no model involved).
 * Run: node --import tsx/esm scratch-plugin/dsh-pdf/test-integration.ts
 */
import { Context } from '@deepseek-ai/cordis'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'

const ctx = new Context()
await ctx.plugin(SystemPrompt, {})
await ctx.plugin(ToolRuntime, { mode: 'both' })
await ctx.plugin(LocalFileSystem, {
  cwd: '/Users/sunshine/Learn-Agent/deepseek-harness/scratch-plugin/dsh-pdf/tests',
})
const mod = await import('./src/index.ts')
await ctx.plugin(mod, { maxCharsPerCall: 200 })

const tool = ctx.tools.get('pdf_read')
if (tool === undefined) throw new Error('pdf_read not registered')
const exec = { signal: new AbortController().signal } as never

const cases: Array<{ label: string; args: { path: string; pages?: string } }> = [
  { label: 'all pages (default)', args: { path: 'fixtures/sample.pdf' } },
  { label: 'pages 2-3', args: { path: 'fixtures/sample.pdf', pages: '2-3' } },
  { label: 'char cap at 200', args: { path: 'fixtures/sample.pdf' } },
  { label: 'missing file', args: { path: 'fixtures/nope.pdf' } },
  { label: 'invalid pages spec', args: { path: 'fixtures/sample.pdf', pages: '1-x' } },
]
for (const c of cases) {
  try {
    const result = await tool.execute(c.args, exec)
    console.log(`=== ${c.label} ===`)
    console.log(String(result).slice(0, 500))
  } catch (error) {
    console.log(`=== ${c.label} ===`)
    console.log('ERROR:', (error as Error).message)
  }
}

console.log('=== schema ===')
const schema = ctx.tools.schemas().find(t => t.name === 'pdf_read')
console.log(JSON.stringify(schema, null, 2))
