/** Disposable CLI install/boot/execute/remove acceptance for a packed plugin. */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
if (!process.argv[2]) throw new Error('Usage: node tests/profile-smoke.mjs <DSH installation directory>');
const runtime = resolve(process.argv[2]);
const cli = join(runtime, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const release = JSON.parse(readFileSync(join(runtime, 'node_modules/@deepseek-ai/dsh/package.json'))).version;
const scratch = mkdtempSync(join(tmpdir(), 'dsh-pdf-smoke-'));
const env = { ...process.env, DSH_HOME: join(scratch, 'home') };
function run(command, args, options = {}) {
  const r = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, ...options });
  if (r.error || r.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${r.error ?? ''}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
const dsh = (...args) => run(process.execPath, [cli, ...args]);
try {
  const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch]))[0];
  dsh('plugin', '--profile', 'pdf-smoke', 'add', join(scratch, packed.filename), '--ignore-scripts');
  const profile = join(env.DSH_HOME, 'profiles/pdf-smoke');
  const manifestPath = join(profile, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath));
  assert.ok(manifest.dsh.profile.bundles.includes('dsh-pdf'), 'CLI reconciles bundle');
  // Minimal real Profile: only the official services the plugin requires.
  manifest.dsh.profile.bundles = ['dsh-pdf'];
  manifest.dsh.profile.patchReload = 'startup';
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const probe = join(scratch, 'probe.mjs');
  writeFileSync(probe, `import { verify } from ${JSON.stringify(pathToFileURL(join(root, 'tests/compatibility.mjs')).href)};\nexport const inject = ['tools', 'fs'];\nexport async function apply() { await verify(${JSON.stringify(runtime)}, ${JSON.stringify(join(profile, 'node_modules/dsh-pdf'))}); }\n`);
  writeFileSync(join(profile, 'cordis.patch.yml'), `- insert:
    - id: pdf-smoke-system-prompt
      name: '@deepseek-ai/dsh-system-prompt'
    - id: pdf-smoke-tools
      name: '@deepseek-ai/dsh-tools'
    - id: pdf-smoke-fs
      name: '@deepseek-ai/dsh-fs-local'
    - id: pdf-smoke-probe
      name: ${JSON.stringify(probe)}
`);
  assert.match(dsh('--profile', 'pdf-smoke', '--dump-config'), /id: dsh-pdf/);
  const boot = dsh('--profile', 'pdf-smoke');
  assert.match(boot, /\[dsh-pdf\] plugin loaded!/);
  assert.match(boot, /PASS: registration/);
  console.log(boot);
  dsh('plugin', '--profile', 'pdf-smoke', 'remove', 'dsh-pdf', '--config.offline=true');
  const removed = JSON.parse(readFileSync(manifestPath));
  assert.ok(!removed.dependencies?.['dsh-pdf']);
  assert.ok(!removed.dsh.profile.bundles.includes('dsh-pdf'));
  assert.doesNotMatch(dsh('--profile', 'pdf-smoke', '--dump-config'), /id: dsh-pdf/);
  console.log(`PASS ${release}: packed install, bundle composition, CLI boot, runtime PDF assertions, CLI uninstall`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
