# DSH compatibility evidence — 0.1.1

Checked on 2026-09-21 with Node.js 22.23.1, pnpm 11.7.0, macOS arm64.

| Official DSH CLI release | Manifest declaration | Packed install | CLI startup | PDF assertions | CLI uninstall |
| --- | --- | --- | --- | --- | --- |
| 0.1.5-rc.2 | compatible | passed | passed | passed | passed |
| 0.1.6-alpha.1 | unknown | not accepted | not accepted | see limitation below | not accepted |
| 0.1.6-alpha.2 | compatible | passed | passed | passed | passed |

The accepted runs used each release's real CLI and its published tools/filesystem services, a freshly packed plugin, and a disposable `DSH_HOME`. The minimal Profile loads the official system-prompt, tool registry and local filesystem services plus this plugin. `patchReload: startup` avoids file watchers in this bounded smoke test. No existing user Profile, LLM provider or API key is used.

Both accepted runs assert bundle composition, actual CLI startup, tool registration, text from a three-page fixture and a real PDF, page selection, missing-file and invalid-range errors, character/page/byte limits, registration disposal, CLI removal, and absence of the bundle after removal. Removal uses pnpm's `--config.offline=true` setting. These are macOS minimal-Profile results, not a browser UI, Windows/Linux, rollback, live-reload, model-driven conversation or independent security audit.

## Why 0.1.1 changes dependency ownership

A fresh packed install of the previous dependency layout reproduced this startup error:

```text
The requested module '@deepseek-ai/dsh-llm' does not provide an export named 'CallId'
```

The plugin directly installed an old `@deepseek-ai/dsh-tools` dependency alongside a new host. It now declares official runtime packages as optional peers supplied by DSH; optional peer metadata prevents pnpm from automatically installing another core stack. Development dependencies remain explicit so TypeScript can compile. `pdfjs-dist` remains the plugin's runtime dependency. The Bundle Patch only inserts the plugin-owned `dsh-pdf` entry.

DSH provides the peer resolution when it launches a Profile. Importing an installed plugin from an unrelated plain Node process does not reproduce that host resolution, especially on alpha.2; the packed smoke test executes its assertions from inside the real CLI startup.

## Reproduce

From a checkout, install build dependencies without lifecycle scripts, then build:

```sh
npm install --ignore-scripts
npm run build
npm install --prefix /tmp/dsh-pdf-runtime-rc2 --ignore-scripts --no-audit --no-fund @deepseek-ai/dsh@0.1.5-rc.2
node tests/profile-smoke.mjs /tmp/dsh-pdf-runtime-rc2
npm install --prefix /tmp/dsh-pdf-runtime-alpha2 --ignore-scripts --no-audit --no-fund @deepseek-ai/dsh@0.1.6-alpha.2
node tests/profile-smoke.mjs /tmp/dsh-pdf-runtime-alpha2
```

Use fresh runtime directories. The test creates and cleans its own temporary Profile, packs the checkout, installs the archive, boots it, runs assertions and removes the plugin. Expected final line:

```text
PASS <release>: packed install, bundle composition, CLI boot, runtime PDF assertions, CLI uninstall
```

For faster development-only checks: `node tests/compatibility.mjs <runtime-directory>`. This does not replace packed installation acceptance.

## Alpha.1 limitation

A standard install of CLI `0.1.6-alpha.1` resolves its broad tool/filesystem dependencies to `0.1.6-alpha.2`; the mixed environment passed the initial direct runtime checks. Attempting to pin only the alpha.1 service packages produced an upstream peer-resolution conflict with alpha.2 dependencies. This is insufficient evidence for an isolated alpha.1 declaration, so it remains `unknown`, not `incompatible` or `compatible`.

The exact matrix is author-supplied evidence. DSH STORE independently decides whether a new fixed commit passes its catalog policy; passing these tests does not promise automatic listing.
