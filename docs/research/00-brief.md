# 00 — Research brief (PM, 2026-11-04)

Read first: docs/PRD.md, then the docs it cites.

## Project facts
- RevVault: revenue-routed credit line + self-repaying BNPL for autonomous agent businesses on NEAR. NEAR Hackathon, deadline 14 Nov 2026 23:59 UTC, today 4 Nov. Tracks 04, 08 (stretch 01).
- Chain: NEAR testnet. Contracts: Rust near-sdk, tests with near-workspaces (Rust). Frontend: Next.js (AGENTS.md says this Next.js has breaking changes; read node_modules/next/dist/docs/ once installed). Wallet connect library undecided. NEAR Intents 1Click API for vendor payout (POST https://1click.chaindefuser.com/v0/quote, X-API-Key).
- Screening is by Claude Code / Codex: public repo must run and match README; one-command setup and `cargo test` are required.
- Honesty constraints: only routed revenue is collateral; Meta Transactions do not redirect revenue; not first on NEAR (bond.credit); APY illustrative; repayment economic not legal; demo is mock until contracts are wired.
- Team: unknown size (docs/tech/open-questions.md). Plan for 4 parallel agent roles.
- Existing design truth: prototype/index.html, prototype/landing.html, prototype/assets/.

## Track A — Design system -> docs/research/01-design-system.md
Inventory both HTML files with file:line citations: colour tokens and use; typography (Mona Sans, Press Start 2P; scale, weights); spacing, radii, shadows, borders; grid, containers, breakpoints; components (buttons, cards, nav, forms, modals/drawers, tables, badges, gauges, bars); motion (keyframes, durations, easing, reduced-motion handling, JS-driven animation); states (hover, focus, disabled, loading, empty, error); page/section structure and shared chrome; every external dependency (fonts, CDN scripts, images). Map each prototype view to the routes in docs/ui/01-screens-and-flows.md and each component to docs/ui/02-component-inventory.md. Flag where the prototype contradicts docs/ui/00-design-direction.md. Raised by: user note that the HTML is approved truth.

## Track B — Tech stack -> docs/research/02-tech-stack.md
Verify against current official docs (label V verified with URL+date, U unverified): near-sdk-rs current version and NEP-141 `ft_on_transfer` / `ft_transfer_call` patterns, promise callbacks and rollback; near-workspaces-rs current version, sandbox on Linux, testnet use; cargo-near build/deploy; Rust toolchain/wasm target requirements; mock USDC FT (reuse near-contract-standards FT); NEP-297 events; function-call keys, sub-accounts, NEP-366 meta tx/relayer feasibility; wallet connection for Next.js today (near-connect vs wallet-selector, testnet support); NEAR RPC endpoints for testnet (FastNEAR etc.) and view calls from a browser; NEAR Intents 1Click API (key access, testnet support, deposit flow, status polling, whether a contract can pay via intents.near); Next.js current version and what changed (read upstream docs); chart/motion libs only if the prototype needs them. Answer open-questions 1-9 where possible. Output: recommended stack with versions, risks, effort in days per piece. Raised by: docs/tech/open-questions.md, contracts-spec.md, architecture.md.

## Track C — Repo audit and structure -> docs/research/04-repo-audit.md
(Track numbering: 04 is repo audit as per the standard layout; 03-domain is skipped.) Audit what exists: structure, absent tooling, README accuracy vs reality. Propose a final public-repo layout: contracts/ (Cargo workspace: revvault contract, mock-usdc FT, tests), app/ (Next.js), scripts/ (seed, demo agent, deploy), docs/. Judge-friendliness: root README with one-command setup (e.g. `make setup` or `./scripts/setup.sh`), one-command `cargo test`, one-command demo (`make demo` running app in mock mode with no wallet and no env), `.env.example` (names only), CI workflow running cargo test + app build, LICENSE, prototype/ kept or moved, docs index. Define file ownership boundaries per role so parallel agents do not collide, and who owns shared root files. Raised by: README and 03-build-plan definition of done.

## Track D — Tooling (PROPOSE ONLY) -> docs/research/06-tooling.md
Find skills and MCP servers suited to NEAR + Rust smart contracts + near-workspaces + NEAR Intents + Next.js wallet integration. Search order: NEAR's own GitHub org, skills.sh, registry.modelcontextprotocol.io, Claude plugin marketplaces; check what the machine already has first. Vet every candidate (read SKILL.md in full). DO NOT INSTALL anything: the user wants to approve first. Output per the tooling file format with an `## Proposed` table instead of `## Installed`.

## Skipped
- Domain track: docs/research/00-hackathon-brief, 01-competitive-landscape, 02-novelty-and-risks already contain it; a re-run would duplicate it. Open competitor verification items (open-questions 10, 11) stay as unverified assumptions at the gate.
