# 02 — Frontend: restyle, copy pass, Vite wrap (R2)

**No tests (owner instruction 2026-11-08).** Do not write or run unit or e2e tests; no vitest. Checks are `eslint` and `tsc --noEmit`, `vite build`, and a manual demo flow in the mock UI via browser-cdp.

Replaces the 2026-11-04 Next.js port handoff (archived in `docs/handoffs/archive-2026-11-04/`). The app is a **Vite wrap of the prototype**, not a Next.js port. You cannot ask the user questions; everything needed is here and in the linked files.

## Context — read first
- `CLAUDE.md`, `docs/handoffs/00-overview.md`, `docs/handoffs/contracts.md` (section 0 wins; sections 8, 10, 11, 15).
- `docs/brainstorm/2026-11-08-ui-restyle-backgrounds-supply.md`: **all of sections 1 (tokens), 2 (sections), 3 (motion), 4 (licensing: what you must not reuse), 5 (change list), verification checklist.** Decisions confirmed by the owner: drop the Pawket identity; pure black `#000` page and `#040611` cards in landing **and** app; blue scale with `#3E68FE` primary; one shared `tokens.css`; Instrument Serif italic (confirm its OFL licence on fonts.google.com; if not confirmable, use Mona Sans italic); restyle P0 first.
- `docs/brainstorm/2026-11-08-prd-alignment.md`: section 3 (creator copy), 4c (Notes dashboard), 5 (split math, demo buttons), 6 (copy edits file by file), Decision D9.
- `docs/research/01-design-system.md` (prototype inventory; the prototype wins over `docs/ui/00-design-direction.md`). Visual tokens change per the restyle plan; behaviour, ids and view templates do not.
- Do not read the saved reference file "Backgrounds Supply … .html" in full; the restyle plan section 4 lists what is unsafe to reuse. Copy no pixel, font, class name or text from it.

## Tools — skills and MCP
No project skills or MCP servers are installed. Use `browser-cdp` and `screen-nav snap` for headless verification (never `hypruse`, `grimblast`, `hyprctl`, `swappy`). Useful global skills: `work:reuse-first`, `work:animation-qa` (before shipping motion), `design-review:design-review` (end audit), `work:typescript-types` (Part C), `near-dapp` (Path B only, never `create-near-app`; live adapter is P1).

## Owned paths
`prototype/**`, `web/**` (including its `package.json`, lockfile, `vite.config.ts`, `tsconfig.json`), `docs/ui/**`. Not yours: `contracts/**`, `scripts/**`, `deployments/**`, `README.md`, `Makefile`, root `Cargo.*`. Dependency additions go through `docs/handoffs/DEPS.md` (pre-approved, exact versions to be pinned by you at install and recorded in DEPS: `vite`, `typescript`, `eslint` (+ typescript-eslint); `near-api-js` only for the P1 live adapter).

## Responsibilities
Three sequential parts, one agent. Do not start a part before the previous part's verification passes.
- **Part A — restyle (P0)** in `prototype/`: tokens and component restyle per the restyle plan section 5 (P0 A, B, C), then verification.
- **Part B — copy pass (P0)** in `prototype/`: the PRD-alignment edits (section 6 of the alignment plan), the new constants and the Notes view.
- **Part C — Vite wrap (P0)** into `web/`, mock mode default and offline; live read adapter (P1); live writes (P1/P2).

## Scope
### In scope
Everything in the restyle plan P0 (P1 only after P0 verification); the alignment-plan copy edits; Notes and Vault view; creator kind; data-driven vendor labels; demo buttons; Vite multi-page app (landing plus app) with `tokens.css` copied unchanged; TypeScript integer micro-USDC engine mirroring the contract vectors; adapter interface per `contracts.md` sections 0 and 8.
### Out of scope
App re-layout, Lenis or any scroll library, WebGL or Unicorn Studio, newsletter or email capture, custom cursor pill, wall slider, any new third-party script, Next.js, wallet connect (stretch, P2), editing root `PRD.md`, any contract or script code, deploying to Vercel (needs the owner's yes), `git` write commands.

## Objectives
1. Both prototype pages look like the reference's structure with the blue scale, with no function lost and no console error.
2. Copy matches the honesty rules and the PRD framing; Notes view shows agent and creator notes.
3. `web/` builds and runs offline in mock mode and reproduces the golden vector.

## Requirements
| # | Pri | Requirement |
|---|---|---|
| A1 | P0 | `prototype/assets/tokens.css` and both pages restyled per restyle plan section 5 P0 (A, B 1-12, C 1-9). No copy string edited in Part A. |
| A2 | P0 | Run the restyle verification checklist (all 12 items); evidence to the scratchpad directory, not the repo. Fix failures before Part B. |
| A3 | P0 | Delete `prototype/assets/pixel-fantasy-bg.webp` after the hero no longer references it. |
| B1 | P0 | Constants in one place: split 20% (2000 bps), term 60 days, reserve 5000 bps, advance agent 40% and creator 30%, fee 3%, no starter limit. Draw guard: a second draw cannot overwrite an open loan. Est. days to clear shown in review with a warning when it exceeds the term. APY computed from `term_days` and labelled illustrative. |
| B2 | P0 | Demo controls: "Customer pays 1,000" and "Simulate a week of sales" (payments 500, 1000, 1500 reproduce the vector and close the loan). |
| B3 | P0 | Copy edits from alignment plan section 6 for `index.html` and `landing.html`: marquee, hero sub (creators), module cards (Underwriting, Lockbox and auto-repay, Revenue notes), vendor chain caption "Intents on mainnet preview", compare row, three new honest-limit entries, tech truth table content; "first" wording exactly as in `CLAUDE.md`. |
| B4 | P0 | Notes and Vault view per alignment section 4c; kind chip; "Business constraints" heading with a creator variant; seeded creator `luna` and one agent note, one creator note, one past-due and one settled in mock data; vendor labels data-driven: "via NEAR Intents" never without a proof field, otherwise "Direct FT (testnet)" or "Paid (mock)". |
| C1 | P0 | `web/`: Vite multi-page (landing and app), prototype markup and CSS ported with the least change, hash routes kept, `tokens.css` copied unchanged, TypeScript strict, no `any`. |
| C2 | P0 | `web/src/lib/engine`: pure integer micro-USDC (bigint) engine and mock adapter; manual flow must reproduce the vector in `contracts.md` section 0 (no test code). Mock is the default with no env and works offline. |
| C3 | P0 | Mode badge reads Mock or Testnet and never blurs them; error states, empty states, loading skeletons for Notes. |
| C4 | P1 | Live read adapter against testnet (FastNEAR RPC `https://test.rpc.fastnear.com`, ids from `deployments/testnet.json`) after G2; shows real notes. |
| C5 | P1 | Live writes: pay link, draw, LP deposit. If they slip, writes stay mock and the UI says so. |
| C6 | P1 | Restyle P1 items (marquee band, Terms card, Built for row, rotator, footer, app screenshot hero). |
| C7 | P2 | Wallet connect via `near-connect-hooks`; freckles, progressive blur, side nav. |

## Dependencies
Part A and B need nothing. Part C needs `contracts/fixtures/math-vectors.json` and `contracts/INTERFACE.md` from R1 (Mon 9 Nov for the loop vector; Tue 10 Nov for notes shapes); if absent, build against `contracts.md` section 0 and reconcile later. C4 needs `deployments/testnet.json` from R3 (G2).
**Heavy-build rule:** Part A and B are static files; no builds. Do not run `npm install` or `vite build` for Part C until the PM tells you R1 is not mid-compile; then run one at a time through the npm shim.

## Constraints
- Honesty: `contracts.md` section 15, verbatim in the UI where the plan says. Never write "first" as fact, "yield", "security", "audited", "Intents payout" without proof, or cite Colosseum or Ping Subscription.
- No comments in code; no `any`, `@ts-ignore`, or non-null assertions that hide real nullables; money is integers; every animation honours `prefers-reduced-motion`; no text below 60% white; WCAG floors per restyle section 1b.
- No new JS library or dependency in `prototype/`. Never rename or delete an id or function the existing JS reads (list in restyle plan section 5 compatibility). Do not read `.env*`.
- Write only inside Owned paths. No `git` write commands.

## Deliverables
`prototype/assets/tokens.css`, restyled `prototype/{index,landing}.html` (A, P0); copy pass and Notes view in the same files (B, P0); `web/**` (C, P0); verification table with pass/fail and evidence paths; `docs/ui/**` updated for the Notes screen, `NotesTable`, kind chip (P1); a README text block for R4 (run commands, mock vs testnet, screenshots list).

## Acceptance criteria
1. Restyle plan acceptance criteria all pass (one `tokens.css`, zero old-blue literals, zero `Press Start 2P`, `#3E68FE` primary with white label, no pink, console clean, reduced motion, no reference imagery or fonts, no third-party script).
2. `rg -i 'first|intents|audited|yield|security' prototype web/src` shows every hit conforms to `CLAUDE.md` honesty wording (list them in the report).
3. In `prototype/index.html`: Customer pays 500, 1000, 1500 after a 500 draw ends with debt 0, loan closed, note settled, available 2,000; the second-draw guard blocks overwriting; Notes view lists agent and creator notes.
4. `web/`: `npm run build`, `npm run typecheck` and `npm run lint` (eslint) exit 0; opening the built app offline shows the same flow in Mock mode.
5. `rg '//' web/src prototype` finds no code comments (URLs excepted).

## If behind schedule — cut first
P2, then C6, then C5 (writes stay mock), then C4 (mock plus read-only claim removed; say so). Never cut: A1-A2, B1-B4, C1-C3.
