# Fork: kqb/omp-providers

Owned fork of [morluto/rea](https://github.com/morluto/rea.git) at
`/Users/yuzucchi/Documents/dot/rea`, branch `kqb/omp-providers`
(`origin=git@github.com:kqb/rea.git`, base `eeeb4ca379a948109542e66a8d0adb3998f6f60d`).

Goal: additively open up the FULL OMP 18.10.3 provider/agent surface while
retaining every native ChatGPT/Codex path byte-for-byte behaviorally.

## What was changed and where

All changes are additive; no existing file behavior was removed or altered
except by appending new registrations.

| Path                                        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/application/OmpProviderSurface.ts`     | **New.** Static catalog of the full OMP provider surface: 115 rows (every `omp auth-broker list --json` ID incl. core + search logins, plus docs-only core providers, 5 local engines incl. `apple`, 21 `web:*` search entries, plus bundled-agent and discovery-order constants). Env-var names verified against `omp://providers.md`, `omp://environment-variables.md`, and `omp auth-broker list --json` (83 loginable IDs, omp/18.10.3). Values are never stored here. |
| `src/application/OmpSurfaceAvailability.ts` | **New.** Resolves the catalog against ambient env vars (presence only, values never read) into `env`/`keyless`/`login`/`missing` rows; queries the installed omp binary for its live availability-filtered catalog (`omp models --kind all --json`) and reports any live provider not covered by the static catalog.                                                                                                                                                       |
| `src/cli/ompSurfaceCommands.ts`             | **New.** Three CLI commands (see below).                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/cliCommandNames.ts`                    | **Appended** `list-omp-providers`, `list-omp-agents`, `omp-model-call` to `CLI_COMMANDS`.                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/cli.ts`                                | **Appended** `registerOmpSurfaceCommands(cli, logger, environment)` after the existing registrations.                                                                                                                                                                                                                                                                                                                                                                      |
| `src/omp/OmpSurfaceDoctor.ts`               | **New.** Doctor inspection `omp-surface`: omp binary version probe + ambient-credential count (names only).                                                                                                                                                                                                                                                                                                                                                                |
| `src/doctorRuntime.ts`                      | **Appended** the OMP inspection to the existing `providerInspections` array.                                                                                                                                                                                                                                                                                                                                                                                               |
| `FORK.md`                                   | **New.** This file.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

New CLI surface:

- `rea list-omp-providers [--provider <id>] [--live]` — full 115-row catalog
  with ambient-credential presence (env names only, never values); `--live`
  also queries the installed omp binary and diffs coverage.
- `rea list-omp-agents` — the 5 bundled OMP agents
  (`scout`, `reviewer`, `security-reviewer`, `task`, `sonic`) plus the
  documented discovery order (project `.omp/agents`, user
  `~/.omp/agent/agents`, extension `agents/`, Claude marketplace roots,
  bundled last).
- `rea omp-model-call --model <provider/model> "<prompt>"` — one bounded
  prompt through the installed omp binary on an explicit model, reusing
  ambient credentials only (env vars / stored OMP logins). Unknown provider
  IDs are rejected before any subprocess runs.

Credential policy: the fork only checks credential **name presence** in the
process environment or delegates to the omp binary's own stored logins. It
never reads, prints, or persists secret values.

## Install / build / run / verify (observed working 2026-10-13)

Toolchain: node v26.0.0, npm 11.12.1 (`.nvmrc` pins 24.18.0; both satisfy
`engines`). OMP: `omp/18.10.3` at `/Users/yuzucchi/.bun/bin/omp`.

```bash
cd /Users/yuzucchi/Documents/dot/rea
git checkout kqb/omp-providers

npm install            # ~4s, 400 packages
npm run build          # turbo artifacts:skills (~4s)
npm run compile        # tsc -p tsconfig.build.json + bundle-runtime (~3s)

# Opened surface:
node scripts/rea.mjs list-omp-providers            # 115 rows + ambient presence
node scripts/rea.mjs list-omp-providers --live     # + live omp catalog diff
node scripts/rea.mjs list-omp-agents               # 5 bundled agents + order
node scripts/rea.mjs omp-model-call --model opencode-go/deepseek-flash "Reply with exactly: REA_FORK_SMOKE_OK"

# Native retention:
node scripts/rea.mjs setup --client codex --yes
node scripts/rea.mjs doctor --client codex
node scripts/rea.mjs analyze-javascript-application /tmp/rea-native-smoke

# Repo checks (run once afterward):
npm run check:fast
npm run verify:omp-client
npm run verify:claude-client
npm run verify:pi-client
npm run verify:hermes-client
```

## How to add another provider

1. Verify the provider ID and credential env vars against the installed omp
   binary (`omp auth-broker list --json`, `omp models --kind all --json`)
   or `omp://providers.md` / `omp://environment-variables.md`. Never guess.
2. Append one row to `OMP_PROVIDERS` in
   `src/application/OmpProviderSurface.ts` using the `core(...)` helper
   (env-var credentials) or `login(...)` helper (stored OAuth/device login,
   no env key). Keep the section order: core, hosted, local engines,
   `web:*` search.
3. Run `npm run compile`, then
   `node scripts/rea.mjs list-omp-providers --live` and confirm
   `uncoveredLiveProviders` stays empty.
4. If the provider is keyless-by-default local discovery (like
   `ollama`/`lm-studio`/`llama.cpp`/`vllm`), extend `KEYLESS_LOCAL_PREFIXES`
   in `src/application/OmpSurfaceAvailability.ts`.

## Observed evidence (2026-10-13)

- `rea list-omp-providers`: 115 providers, 30 ambient-ready in this shell
  (5 env-backed: `deepseek`, `huggingface`, `opencode-go`, `opencode-zen`,
  `web:brave`; 25 keyless local/search).
- `rea list-omp-providers --live`: omp/18.10.3 reports 1322 models across
  11 live provider groups; `uncoveredLiveProviders: []`.
- Non-OpenAI call: `omp-model-call --model opencode-go/deepseek-flash`
  returned `REA_FORK_SMOKE_OK` (`stopReason: stop`) via ambient
  `OPENCODE_API_KEY`. Direct `deepseek/*` calls fail with upstream
  `402 Insufficient Balance` (account-side, not fork-side); several zen
  models return 400/402 upstream errors.
- Native Codex retention: `setup --client codex --yes` → `ready`;
  `doctor --client codex` → `healthy: true`, registration `aligned`;
  MCP stdio `initialize` + `tools/call analyze_javascript_application`
  returned evidence `ev_bf705e…`; `omp-model-call --model
  openai-codex/gpt-6-sol` returned `REA_CODEX_SMOKE_OK`.
