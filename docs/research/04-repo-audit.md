# 04 — Repo audit

## Summary

- The repo is docs plus a static HTML prototype and nothing else. It has no code, no manifests, no lockfiles, no `.gitignore`, no `LICENSE`, no `.github/`, and it is not a git repo. Every screener requirement (`cargo test`, one-command setup, public repo, CI) is currently unmet, which is expected at this stage (`README.md:6`).
- The README is accurate for the research phase (it says "No code yet", `README.md:6`). It does not match the definition of done, which needs setup, `cargo test`, demo URL, testnet ids and the track mapping (`docs/03-build-plan.md:22-25`). It also omits PRD.md, the research briefs and the handoffs from its map (`README.md:14-27`).
- The prototype has no broken local references. The only local asset is `prototype/assets/pixel-fantasy-bg.webp` (420 KB, present). Both pages depend on the Google Fonts CDN (Mona Sans, Press Start 2P), so offline they fall back to system fonts.
- Local toolchain: `cargo`/`rustc` 1.99.1, the `wasm32-unknown-unknown` target, `node` v26.12.1, `pnpm` and `docker` are present. `near` and `cargo-near` are absent. This is the machine as observed, not a requirement of the project.
- Proposed layout, with these choices argued below:
  - A **root-level virtual Cargo workspace** (`contracts/*` members), so a bare `cargo test` works from the repo root.
  - A pnpm workspace with `app/` and `scripts/`.
  - A thin root `Makefile` as the single command surface: `make setup`, `make test`, `make demo`, `make agent`, `make verify`.
  - `prototype/` moves to `docs/design/prototype/` on Day 9.
- Four roles own disjoint paths. Role 4 owns all shared root files and lockfiles. Other roles request dependencies through an append-only `docs/handoffs/DEPS.md`.

## Findings

### F1. What exists (all paths relative to repo root)

| Path | Size (bytes) | Note |
|---|---|---|
| `README.md` | 2910 | research-workspace README, 37 lines |
| `docs/PRD.md` | 2621 | 32 lines |
| `docs/03-build-plan.md` | 1947 | 30 lines |
| `docs/handoffs/STATUS.md` | 864 | PM status, 18 lines |
| `docs/research/00-brief.md` | 4843 | this task's brief |
| `docs/research/00-hackathon-brief.md` | 2567 | |
| `docs/research/01-competitive-landscape.md` | 2709 | |
| `docs/research/02-novelty-and-risks.md` | 4109 | |
| `docs/tech/architecture.md` | 3912 | 59 lines |
| `docs/tech/contracts-spec.md` | 3406 | 59 lines |
| `docs/tech/open-questions.md` | 2278 | |
| `docs/ui/00-design-direction.md` | 2926 | |
| `docs/ui/01-screens-and-flows.md` | 4958 | |
| `docs/ui/02-component-inventory.md` | 3494 | |
| `prototype/index.html` | 49993 | app prototype, hash routes, inline `<script>` at `index.html:265` |
| `prototype/landing.html` | 57526 | landing, inline `<script>` at `landing.html:422` |
| `prototype/assets/pixel-fantasy-bg.webp` | 419638 | only asset |

### F2. Absent items (verified by `ls`/`find`)

- Missing: `.git`, `.gitignore`, `LICENSE`, `Cargo.toml`, `rust-toolchain.toml`, `package.json`, `.nvmrc`, `Makefile`, `.env.example`, `.github/workflows/`, `contracts/`, `app/`, `scripts/`.
- The repo is not a git repository (`git rev-parse` failed with "not a git repository"). Public submission needs `git init` and a remote (`docs/research/00-hackathon-brief.md:24` lists "Public repo").
- There is no `node_modules/`. `AGENTS.md` says to read `node_modules/next/dist/docs/` before writing Next.js code. That is impossible until `app/` is scaffolded and installed (`docs/tech/open-questions.md:13`).
- A root `AGENTS.md` and `CLAUDE.md` exist in the user's home project context. Neither is in this repo directory (`ls` shows neither). The Next.js warning block is re-added by `next dev` (per the AGENTS.md text), so expect it to appear in `app/` or root on first run.

### F3. Prototype reference integrity

- `prototype/landing.html:308` references `assets/pixel-fantasy-bg.webp`. The file exists, so the reference resolves.
- `prototype/landing.html:303` and `:416` link to `index.html#/business`, `index.html#/demo` and `index.html#/lp`. `prototype/index.html:252` links back to `landing.html`. All of these are relative siblings, so the pair works as long as the two files and `assets/` move together.
- `prototype/index.html:7-9` and `prototype/landing.html:7-9` load `fonts.googleapis.com` for Mona Sans (wght 400-900) and Press Start 2P. This is the only external dependency of the prototype. `index.html` loads no local assets.
- Neither file uses a CDN script. The only `<script>` blocks are inline (`index.html:265`, `landing.html:422`).
- The prototype route names (`#/business`, `#/demo`, `#/lp`) use a different scheme from the planned Next.js routes (`/app/business`, `/demo`; `docs/ui/01-screens-and-flows.md:8-13`). This is a porting item for role 2.

### F4. README claims versus reality

| README claim | Reality |
|---|---|
| "research phase. No code yet" (`README.md:6`) | True. |
| Map table lists 10 docs (`README.md:16-27`) | All 10 listed files exist. It omits `docs/PRD.md`, `docs/research/00-brief.md`, `docs/handoffs/STATUS.md` and `prototype/`. |
| "README + one-command demo are part of the product" (`README.md:12`) | No one-command demo and no setup instructions exist. |
| Definition of done wants one-command setup, `cargo test`, demo URL, testnet contract ids, track mapping (`docs/03-build-plan.md:22-25`; `docs/PRD.md:32`) | None present. |
| Prior-art wording (`README.md:33`, `:37`) | Out of scope here; checked by the novelty doc. |

### F5. Spec constraints the layout must serve

- Tests are `near-workspaces` (Rust) sandbox tests, and "`cargo test` must pass in one command" (`docs/tech/contracts-spec.md:54`).
- Contracts are a single contract with module boundaries, plus an own mock USDC FT with 6 decimals (`docs/PRD.md:13`; `docs/tech/contracts-spec.md:1`, `:57`).
- The frontend is mock-first behind a `RevVaultApi` interface, and swapping to testnet is "a single module change" (`docs/ui/02-component-inventory.md:3`, `:37`, `:49`).
- The `/demo` page must work with no wallet (`docs/03-build-plan.md:24`; `docs/PRD.md:32`), and the UI must label Mock vs Testnet (`docs/PRD.md:23`).
- The demo agent is a script or service that sells a service, draws and repays (`docs/tech/architecture.md:50`).
- The Intents 1Click call is `POST https://1click.chaindefuser.com/v0/quote` with `X-API-Key` (`docs/research/00-brief.md:7`; `docs/tech/open-questions.md:5`). A key is therefore an env var and must not be required for the mock path.
- Honesty constraints that must appear in the README are at `docs/PRD.md:17-23`.
- The 10-day schedule has the README, screenshots and video on Day 9 (`docs/03-build-plan.md:15`).

### F6. Toolchain observed on this machine

- `cargo 1.99.1` (Arch package) and `rustup`. The installed targets are `wasm32-unknown-unknown`, `wasm32v1-none` and the host target.
- `cargo-near` and `near` CLI are not found.
- `node v26.12.1`, `pnpm` in `~/.local/bin`, `docker` available.
- `~/.cargo/bin` has `cargo-binstall`, so `cargo-near` can be installed via binstall if needed.

## Recommendations

### R1. Final public repo layout

```
revvault-rwa/
├── README.md                  # screener entry point (skeleton in R9)
├── LICENSE                    # MIT
├── Makefile                   # single command surface (R3)
├── Cargo.toml                 # virtual workspace, members = contracts/*
├── Cargo.lock
├── rust-toolchain.toml
├── package.json               # private root: scripts proxy, packageManager, engines
├── pnpm-workspace.yaml        # packages: [app, scripts]
├── pnpm-lock.yaml
├── .nvmrc
├── .gitignore
├── .env.example
├── .github/workflows/ci.yml
├── contracts/
│   ├── INTERFACE.md           # method names, JSON arg shapes, events (consumed by app and scripts)
│   ├── revvault/              # the contract (modules: router, vault, credit, loans)
│   ├── mock-usdc/             # NEP-141 FT, 6 decimals, open mint for testnet
│   └── tests/                 # crate revvault-tests: near-workspaces sandbox tests
├── app/                       # Next.js; mock-first adapter; /demo, /app/*, landing
├── scripts/                   # setup.sh, seed, deploy, agent (TS), smoke.sh
└── docs/
    ├── README.md              # docs index
    ├── PRD.md, 03-build-plan.md
    ├── tech/, ui/, research/, handoffs/
    └── design/prototype/      # moved prototype (R2)
```

Why the Cargo workspace manifest is at the root and not at `contracts/Cargo.toml`: a screener's first reflex is `cargo test` in the repo root. With a `contracts/Cargo.toml` workspace that fails with "could not find Cargo.toml". A virtual workspace at the root with `members = ["contracts/revvault", "contracts/mock-usdc", "contracts/tests"]` makes bare `cargo test` work, and `contracts/` still holds all Rust. `Cargo.lock` and `rust-toolchain.toml` sit at the root. The cost is that Cargo.toml and Cargo.lock become root files owned by Role 4 (R10).

### R2. Prototype: keep or move? Decision: move to `docs/design/prototype/` on Day 9

- Argument for moving: a screener scanning the root sees `prototype/index.html` and may judge it as the product, or may open the mock HTML as "the demo". The real demo is `app/` `/demo`. `docs/design/` signals "reference, not product". The prototype is also an approved design reference (`docs/PRD.md:15`), so it must stay in the repo.
- Argument against moving now: research docs and handoffs cite `prototype/index.html:NN` paths, and Role 2 reads them while porting. Moving early breaks those citations and the working reference.
- Decision: leave it at `prototype/` until the frontend port is accepted (Day 9, `docs/03-build-plan.md:15`). Then Role 4 runs `mv prototype docs/design/prototype` (as `git mv`), keeps `index.html`, `landing.html` and `assets/` together so the relative links in F3 survive, and rewrites cited paths with one grep-and-replace. The app copies what it needs (the `.webp`) into `app/public/` and must not reference `docs/design/`.
- Fonts: the app should self-host Mona Sans and Press Start 2P (via Next font loading) so the demo renders correctly offline and in screenshots. This is a recommendation for Role 2 and is not verified against the font licences (see Assumptions).

### R3. Command surface (all from repo root, no env vars, no wallet)

| Goal | Command | What it runs |
|---|---|---|
| One-command setup | `make setup` | `scripts/setup.sh`: checks `rustup` and `corepack`; `rustup show` installs the pinned toolchain, components and `wasm32-unknown-unknown` from `rust-toolchain.toml`; `corepack enable`; `pnpm install --frozen-lockfile`; prints "next: make test, make demo". It copies `.env.example` to `.env` only if the user asks via `make env`. It never needs a key. |
| One-command tests | `cargo test` (alias `make test`) | Runs the whole workspace: the unit tests in `contracts/revvault` and the near-workspaces sandbox tests in `contracts/tests`. The sandbox tests compile the wasm themselves (via `near_workspaces::compile_project` or an equivalent build step, so no prebuilt artefact is committed). |
| One-command mock demo | `make demo` | `pnpm --filter app dev --port 3000`. With no env vars the app must default to `mock` mode. It must print "open http://localhost:3000/demo". The UI shows the Mock badge (`docs/PRD.md:23`). |
| Terminal-only demo | `make agent` | `pnpm --filter scripts agent --mock`: runs the demo-agent loop (sell service, draw 500, split 20%, repay 515) against the same mock math with no network and prints the story from `docs/PRD.md:26`. |
| Full verification | `make verify` | `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter app build` (no env), `scripts/smoke.sh` (starts the built app, `curl -f /demo`). This is what CI runs. |
| Testnet path (documented, needs keys) | `make deploy`, `make seed`, `make agent-testnet` | Reads `.env`. Prints the contract ids to paste into the README. |

Contract for mock mode: `NEXT_PUBLIC_REVVAULT_MODE` is unset or `mock` means in-memory adapter; only `testnet` switches to RPC (`docs/ui/02-component-inventory.md:49`).

### R4. `.env.example` (names only; no values)

```
NEXT_PUBLIC_REVVAULT_MODE=            # mock | testnet (default mock when unset)
NEXT_PUBLIC_NEAR_NETWORK=             # testnet
NEXT_PUBLIC_NEAR_RPC_URL=
NEXT_PUBLIC_REVVAULT_CONTRACT_ID=
NEXT_PUBLIC_USDC_CONTRACT_ID=
NEAR_DEPLOYER_ACCOUNT_ID=             # deploy and seed scripts only
NEAR_DEPLOYER_PRIVATE_KEY=            # scripts only, never NEXT_PUBLIC_
AGENT_ACCOUNT_ID=                     # demo agent (business)
AGENT_PRIVATE_KEY=                    # function-call key for request_draw / repay (docs/tech/architecture.md:44)
VENDOR_ACCOUNT_ID=                    # GPU-Provider stand-in
ONECLICK_API_KEY=                     # NEAR Intents 1Click X-API-Key (docs/research/00-brief.md:7)
ONECLICK_BASE_URL=                    # https://1click.chaindefuser.com
```

Rules: names only in `.env.example`; `.env*` (except `.env.example`) is git-ignored; only `NEXT_PUBLIC_*` names may be read by browser code; private keys are read only by `scripts/`.

### R5. Pinned toolchain

- `rust-toolchain.toml` at the root: `channel` set to one exact Rust version (the version Role 1 verifies passes `cargo test`), `components = ["rustfmt", "clippy"]`, `targets = ["wasm32-unknown-unknown"]`, `profile = "minimal"`. The local compiler is 1.99.1 (F6), but whether near-sdk wasm output on that version is accepted by the sandbox runtime is not verified here (see Assumptions). Role 1 records the verified version and does not use `stable`.
- `.nvmrc`: a single major, proposed `24`. Role 2 must confirm `app` builds on it, since the dev machine runs v26.12.1.
- `package.json` (root): `"packageManager": "pnpm@<exact version from \`pnpm -v\`>"`, `"engines": { "node": ">=24" }`, `"private": true`, scripts that proxy to `pnpm --filter`. `app/package.json` and `scripts/package.json` each set `"private": true` and no `packageManager`, because pnpm reads the root one.
- Lockfiles `Cargo.lock` and `pnpm-lock.yaml` are committed. Installs in CI use `--frozen-lockfile`, and Cargo uses `--locked`.
- Dependency versions are exact, with no `^` ranges, so a clone a week later behaves the same.

### R6. CI workflow outline (`.github/workflows/ci.yml`, on push and pull_request)

1. Job `contracts` (ubuntu-latest): `actions/checkout`; install the toolchain from `rust-toolchain.toml` (it carries the wasm target); cache `~/.cargo` and `target/`; `cargo fmt --all --check`; `cargo clippy --workspace --all-targets --locked -- -D warnings`; `cargo test --workspace --locked`. The near-sandbox binary is downloaded on first test run, so the job needs network and the cache must include its location.
2. Job `app` (ubuntu-latest): checkout; `actions/setup-node` with `node-version-file: .nvmrc`; `corepack enable`; `pnpm install --frozen-lockfile`; `pnpm typecheck`; `pnpm lint`; `pnpm --filter app build` with no env vars set (proves the mock default).
3. Job `demo-smoke` (needs `app`): `scripts/smoke.sh` starts `next start`, waits for the port, `curl -f` on `/demo` and `/`, then kills the server. `pnpm --filter scripts agent --mock` must exit 0.
4. No secrets are used. `ONECLICK_API_KEY` is never read in CI.
5. A README badge points at this workflow.

### R7. LICENSE

MIT, copyright "RevVault contributors" with the year 2026, at the root. The hackathon doc only says "Public repo" (`docs/research/00-hackathon-brief.md:24`); no licence requirement is stated, so MIT is a default and not a rule (see Assumptions). The `package.json` `license` field and each `Cargo.toml` `license` field must say `MIT`.

### R8. `.gitignore`

`target/`, `node_modules/`, `.next/`, `out/`, `.env`, `.env.*` with `!.env.example`, `*.log`, `.DS_Store`, `.near-credentials/`, `**/neardev/`, `coverage/`, plus `contracts/**/res/` only if wasm artefacts are generated rather than committed (decision for Role 1).

### R9. README skeleton (sections a screener checks, in order)

1. Title, one-line pitch, CI badge, Mock/Testnet note.
2. **What it is** (3 sentences, from `docs/PRD.md:6`).
3. **Quickstart (60 seconds)**: three commands, `make setup`, `cargo test`, `make demo`, each with the expected last output line.
4. **Demo**: hosted URL (if deployed, Day 9), local `/demo` steps for the 90 s story (`docs/PRD.md:26`), and the `make agent` terminal alternative. States clearly that `/demo` runs in Mock mode without a wallet.
5. **Testnet**: contract ids table (revvault, mock USDC), explorer links, `.env.example` explanation, `make deploy` and `make seed` steps. Leave a visible "TBD" until real ids exist; never invent ids.
6. **How it works**: money-flow diagram from `docs/tech/architecture.md:16-28`, credit and repay math from `docs/tech/contracts-spec.md:39-43`.
7. **Repo layout**: the tree in R1, one line per directory.
8. **Tests**: what `cargo test` covers, mapped to the six invariants in `docs/tech/contracts-spec.md:45-51`.
9. **Honesty and limitations** (verbatim from `docs/PRD.md:17-23`): only routed revenue counts as collateral; NEP-366 Meta Transactions do not redirect revenue; not first on NEAR (bond.credit lists NEAR), claim only "first revenue-routed credit line for agent businesses on NEAR"; APY is illustrative; repayment is economic, not legal; the demo uses mock data until contracts are wired. Add: testnet only, unaudited, mock USDC is not real money, Intents payout is mocked and logged if the real call was cut (`docs/03-build-plan.md:20`).
10. **Hackathon**: tracks 04 and 08 (stretch 01) with a one-line mapping each, links to the X post and video.
11. **Docs index** link to `docs/README.md`, **License**.

The current README text becomes `docs/README.md` (the docs index and decision log) so nothing is lost.

### R10. Path ownership (every path has exactly one owner)

Roles: **R1** contracts; **R2** frontend port; **R3** demo agent + Intents integration + scripts; **R4** submission, README, video, CI.

| Path | Owner | Notes |
|---|---|---|
| `contracts/revvault/**` | R1 | including its `Cargo.toml` |
| `contracts/mock-usdc/**` | R1 | including its `Cargo.toml` |
| `contracts/tests/**` | R1 | near-workspaces tests |
| `contracts/INTERFACE.md` | R1 | the ABI source of truth; R2 and R3 read-only |
| `app/**` (incl. `app/package.json`, `app/public/`) | R2 | owns the mock adapter and the `RevVaultApi` types |
| `scripts/agent/**`, `scripts/intents/**` | R3 | demo agent, 1Click client |
| `scripts/setup.sh`, `scripts/seed.*`, `scripts/deploy.*`, `scripts/smoke.sh`, `scripts/package.json` | R3 | |
| `docs/design/**` (after the move) and `prototype/**` (before) | R2 reads, R4 moves | content frozen; only R4 may move it |
| `docs/tech/**` | R1 | spec updates when the contract changes |
| `docs/ui/**` | R2 | |
| `docs/research/**` | R4 | historical; append-only |
| `docs/handoffs/**` | R4 | including `STATUS.md` and `DEPS.md` (append-only for all roles) |
| `docs/PRD.md`, `docs/03-build-plan.md`, `docs/README.md` | R4 | |
| `README.md`, `LICENSE` | R4 | other roles send README text to R4 as a block in their handoff report |
| `.github/**` | R4 | |
| `Makefile` | R4 | target names fixed in R3; recipes call scripts owned by R3 |
| `Cargo.toml` (root workspace), `Cargo.lock`, `rust-toolchain.toml` | R4 | workspace members list changes only on request |
| `package.json` (root), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.nvmrc` | R4 | |
| `.gitignore`, `.env.example` | R4 | R2/R3 request new env names via DEPS.md |
| `.git/` (init, remote, commits) | R4 | |
| `demo-assets/` (screenshots, video, X post copy), if created | R4 | |

Shared files that a role needs to touch:
- `Makefile`, `.env.example`, `.gitignore`, root manifests: R4 only.
- A leaf manifest (`contracts/*/Cargo.toml`, `app/package.json`, `scripts/package.json`) is owned by the leaf owner for everything except dependency additions, which go through the rule below.

### R11. Dependency request rule

1. A role that needs a new crate, npm package, env var, Makefile target, workspace member or ignore pattern appends one row to `docs/handoffs/DEPS.md`: `date | role | kind (crate/npm/env/make/ignore) | name and exact version | why | blocking? (y/n)`. It does not edit the manifest or the lockfile itself.
2. R4 applies the request: edits the leaf and root manifests, runs the install to refresh `Cargo.lock` or `pnpm-lock.yaml`, verifies `make verify` still passes, and marks the row `done <date>`. R4 handles blocking rows first.
3. Only R4 runs commands that rewrite lockfiles (`pnpm install` without `--frozen-lockfile`, `cargo update`, `cargo add`). Other roles use `--frozen-lockfile` and `--locked`. This prevents two agents rewriting `pnpm-lock.yaml` or `Cargo.lock` at once, since the directory is not a git repo and there is no merge to resolve it.
4. If a request is blocking and R4 has not answered, the requester proceeds behind its own interface (a stub or an inline helper) and does not work around it by hand-editing a lockfile.
5. R4 rejects a request that adds a heavy dependency (build time, wasm size, or a second UI or chart library) unless the requester names the specific need. Reasons go in the same row.

## Implications per role

**R1 (contracts)**
- Owns `contracts/**`, `contracts/INTERFACE.md`, `docs/tech/**`.
- Must make bare `cargo test` pass from the root with no prebuilt wasm and no keys. Must record the exact Rust version that works and tell R4 for `rust-toolchain.toml`.
- Must publish `contracts/INTERFACE.md` early (Day 2-3, `docs/03-build-plan.md:8-9`) so R2 and R3 can type their clients: methods, argument JSON, event names (`docs/tech/contracts-spec.md:37`).
- Decides whether the compiled wasm is generated or committed (affects `.gitignore`).

**R2 (frontend port)**
- Owns `app/**` and `docs/ui/**`. Reads the prototype at its current path until Day 9 and does not edit it.
- Defaults to mock mode with no env, shows the Mock/Testnet badge, ships `/demo` without a wallet, and self-hosts fonts.
- Maps the prototype hash routes to the Next.js routes (F3). Reads `app/node_modules/next/dist/docs/` before writing code (AGENTS.md).
- Provides a build that passes with no env vars (CI job `app`) and a `typecheck` and `lint` script in `app/package.json`.

**R3 (demo agent, Intents, scripts)**
- Owns `scripts/**`. Provides `setup.sh`, `smoke.sh`, `agent` (with `--mock`), `seed`, `deploy`, and the 1Click client.
- The mock path must need no env vars and no network. The testnet path reads only the names in R4.
- Uses the same fee, split and limit math as `docs/tech/contracts-spec.md:39-43`. Shares it with R2 by importing from `app` only if R4 agrees; otherwise duplicates it and tests both against the same fixture. This is an open question.
- Intents: if the real payout is cut, log and mock it and say so (`docs/03-build-plan.md:20`).

**R4 (submission, README, video, CI)**
- Owns every root file, lockfiles, `.github/`, `Makefile`, the README, `LICENSE`, `.git` and `docs/handoffs/**`.
- Day 1-2: `git init`, `.gitignore`, `LICENSE`, root manifests and `Makefile` skeleton with the fixed target names, `.env.example`, `docs/handoffs/DEPS.md`, move the current `README.md` to `docs/README.md`.
- Day 9: README to the R9 skeleton, the prototype move (R2), screenshots, 90 s video, X post (`docs/03-build-plan.md:15-16`). Day 10: a clean-clone dry run: fresh clone, `make setup`, `cargo test`, `make demo`, `make verify`.
- Applies DEPS.md rows (R11).

## Assumptions and open questions

Assumptions (no citation available, or inferred):
- A1. MIT is acceptable to the hackathon organisers. `docs/research/00-hackathon-brief.md` only says "Public repo". Verify there is no licence requirement.
- A2. `near-workspaces` can compile the contract inside `cargo test` (`compile_project`) and download its sandbox binary on a clean Linux machine and in GitHub Actions. This is Track B's question and is unverified here.
- A3. The newest Rust compilers (the local one is 1.99.1) may produce wasm that the NEAR runtime or sandbox does not accept without special flags. If so, the pinned toolchain must be older, or `cargo-near` must be used for the wasm build, which adds an install step to `make setup`. Unverified.
- A4. Node 24 is a supported LTS for the Next.js version the scaffold will pull in, and the dev machine's Node 26 also works. Unverified.
- A5. Mona Sans and Press Start 2P are licensed for self-hosting (both are published through Google Fonts, but this was not checked).
- A6. A virtual workspace at the root does not clash with Next.js tooling or with `near-workspaces` building contracts from a path.
- A7. The repo will be created fresh (a new `git init` and public remote) with no secret in history. No secret exists in the current files according to the grep of env-like names, but the home-level CLAUDE.md contains credentials unrelated to this repo and must never be copied into it.
- A8. The agent roles run in one shared working tree with no branches. If each role instead gets a branch or a worktree, R11 rule 3 can relax to normal merge handling.

Open questions:
1. Do R2 and R3 share one TypeScript module for the credit math, or duplicate and fixture-test it? (Decide before Day 3.)
2. Is a hosted `/demo` URL expected on Vercel (Day 9 deploy, `docs/03-build-plan.md:15`)? If yes, R4 adds a Vercel setting and `NEXT_PUBLIC_REVVAULT_MODE=mock` as an explicit project env value.
3. Team size and who writes Rust is still undecided (`docs/tech/open-questions.md:17-20`). If one person runs several roles, merge the table rows but keep the owner column per path.
4. Should the compiled wasm be committed under `contracts/**/res/` for faster screener runs, or always built? Tradeoff: size and staleness versus an extra build step.

## Sources

Files read, all under `/home/cn/Projects/Competition/Web3/NEAR/revvault-rwa/`:
- `docs/research/00-brief.md` (Track C at line 19-20; project facts 5-11)
- `docs/PRD.md` (lines 6, 9, 13, 15, 17-23, 25-26, 31-32)
- `README.md` (lines 6, 12, 14-27, 33, 37)
- `docs/03-build-plan.md` (lines 8-9, 15-16, 20, 22-25)
- `docs/tech/architecture.md` (lines 16-28, 44, 50)
- `docs/tech/contracts-spec.md` (lines 1, 37, 39-43, 45-51, 54, 57)
- `docs/tech/open-questions.md` (lines 5, 13, 17-20)
- `docs/handoffs/STATUS.md` (full)
- `docs/research/00-hackathon-brief.md` (line 24, plus a grep for licence terms)
- `docs/ui/01-screens-and-flows.md` (lines 8-13), `docs/ui/02-component-inventory.md` (lines 3, 37, 49)
- `prototype/index.html` (lines 6-9, 252, 265, 391), `prototype/landing.html` (lines 7-9, 303, 308, 416, 422)

Commands run (read-only): `ls`, `find` with sizes, `git rev-parse --is-inside-work-tree`, `wc -l`, `grep`, `which cargo rustc node pnpm npm near cargo-near docker`, `node -v`, `cargo -V`, `rustup target list --installed`, `ls ~/.cargo/bin`.
