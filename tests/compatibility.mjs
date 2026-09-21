/** Run against an independently installed official DSH release; no model/API key. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export async function verify(runtimeDirectory, pluginDirectory) {
const pluginEntry = pluginDirectory ? pathToFileURL(resolve(pluginDirectory, 'lib/index.js')).href : new URL('../lib/index.js', import.meta.url).href;
const pdf = await import(pluginEntry);
const runtime = createRequire(resolve(runtimeDirectory, 'package.json'));
const load = name => import(pathToFileURL(runtime.resolve(name)).href);
const { Context } = await load('@deepseek-ai/cordis');
const { SystemPrompt } = await load('@deepseek-ai/dsh-system-prompt');
const { ToolRuntime } = await load('@deepseek-ai/dsh-tools');
const { LocalFileSystem } = await load('@deepseek-ai/dsh-fs-local');
const ctx = new Context();
const services = [];
try {
  services.push(await ctx.plugin(SystemPrompt, {}));
  services.push(await ctx.plugin(ToolRuntime, { mode: 'both' }));
  services.push(await ctx.plugin(LocalFileSystem, { cwd: fileURLToPath(new URL('.', import.meta.url)) }));
  const exec = { signal: new AbortController().signal };
  async function check(config, run) {
    const fork = await ctx.plugin(pdf, config);
    try {
      const tool = ctx.tools.get('pdf_read');
      assert.ok(tool, 'pdf_read must register in the official runtime');
      await run((args) => tool.execute(args, exec));
    } finally {
      await fork.dispose();
    }
    assert.equal(ctx.tools.get('pdf_read'), undefined, 'disposal must remove the tool');
  }
  await check({}, async read => {
    const all = await read({ path: 'fixtures/sample.pdf' });
    assert.match(all, /Total pages: 3/);
    assert.match(all, /Hello from page one/);
    assert.match(all, /--- page 3 ---/);
    const range = await read({ path: 'fixtures/sample.pdf', pages: '2-3' });
    assert.doesNotMatch(range, /--- page 1 ---/);
    assert.match(range, /Page two says goodbye/);
    const real = await read({ path: 'fixtures/w3-dummy.pdf' });
    assert.match(real, /Dummy PDF file/);
    await assert.rejects(() => read({ path: 'fixtures/missing.pdf' }), /file not found/);
    await assert.rejects(() => read({ path: 'fixtures/sample.pdf', pages: '1-x' }), /invalid pages spec/);
    await assert.rejects(() => read({ path: 'fixtures/sample.pdf', pages: '3-1' }), /invalid page range/);
    await assert.rejects(() => read({ path: 'fixtures/sample.pdf', pages: '9' }), /selects no page/);
  });
  await check({ maxCharsPerCall: 60 }, async read => {
    const text = await read({ path: 'fixtures/sample.pdf' });
    assert.match(text, /character limit/);
    assert.doesNotMatch(text, /--- page 2 ---/);
  });
  await check({ maxPages: 2 }, async read => {
    const text = await read({ path: 'fixtures/sample.pdf' });
    assert.match(text, /maxPages/);
    assert.doesNotMatch(text, /--- page 3 ---/);
  });
  await check({ maxFileBytes: 1 }, async read => {
    await assert.rejects(() => read({ path: 'fixtures/sample.pdf' }), /above the 1-byte limit/);
  });
  console.log('PASS: registration, PDF text, page ranges, real PDF, missing file, invalid ranges, character/page/byte limits, disposal');
} finally {
  for (const service of services.reverse()) await service.dispose();
}
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node tests/compatibility.mjs <DSH installation directory>');
  await verify(process.argv[2], process.argv[3]);
}
