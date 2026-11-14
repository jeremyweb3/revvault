> **SUPERSEDED 2026-11-08** by `docs/brainstorm/2026-11-08-prd-alignment.md` and `docs/handoffs/00-overview.md`. Decisions D3, D9 and D10 (split 25%, reserve, term) are replaced by D6 of the new plan; the Vite wrap (D7) stands, the 2026-11-08 plan wins.

# RevVault: 10-day tech plan, scope cuts, adapter swap, pitch and handoff

- **Date**: 2026-11-04 · **Project**: RevVault (NEAR Hackathon, deadline 14 Nov 2026 23:59 UTC, judging 16-18 Nov) · **Mode**: Smart contract / web3, Feature build, Business (pitch)
- **Status**: draft (decisions unconfirmed). The planning agent could not ask questions in this session, so every decision below is a recommendation; open questions are in the Open questions section. A builder must put Q1-Q4 to Candra before starting Day 2 work.
- **Companion files**: [architecture](./2026-11-04-revvault-10-day-plan/architecture.md) (diagrams, data model, scaling checklist) · [research](./2026-11-04-revvault-10-day-plan/research.md) (sources R1-R21, R-C1-R-C11) · [pitch and demo](./2026-11-04-revvault-10-day-plan/pitch-and-demo.md) (judging angle, Q&A, 90 s script, X plan)

## Context

Already decided and not redone here: `README.md`, `docs/research/00-02`, `docs/tech/{architecture,contracts-spec,open-questions}.md`, `docs/ui/00-02`, `docs/03-build-plan.md`. The prototype (`prototype/index.html`, `prototype/landing.html`) is a working mock app and the UI direction is approved. There is no contract, no repo tooling and no `package.json` yet.

State that shapes the plan (verified by reading the repo on 2026-11-04):
- All contract math runs in the browser in `prototype/index.html:299-358` over one in-memory object `S`; renderers are synchronous (`render()` at line 377). Amounts are JS floats.
- Parameters in the prototype: advance 40%, split 25%, fee 3% flat (300 bps), term 30 days, cap 2,000, `reserveBps` 1000 (`index.html:299`).
- Laptop toolchain: rustc 1.99.1, `wasm32-unknown-unknown` installed, `cargo-near` and the `near` CLI not installed, node 26, pnpm present (research R11).
- Time left: 10 days. The old build plan assumed UI first; UI is now done, so the tech track moves to the front.
- Screening is done first by Claude Code / Codex, which check the project runs and matches the README. `cargo test` and a one-command app start are part of the product.

## The question

What is the tech plan for the remaining 10 days: one contract or vault plus router, what is the exact MVP, what is cut and in what order, and how does the approved mock UI swap to real testnet contracts, plus how to pitch it honestly, the 90 s demo, the X plan, and a paste-ready handoff.

## Decision

**Recommendation (unconfirmed): one contract `revvault.<dev>.testnet` with four code modules, plus our own mock USDC; the app keeps the prototype and swaps through a snapshot-based adapter; Intents is a separate mainnet proof, not a contract dependency.**

Why it beat the alternatives: a split vault and router doubles the async surface (`ft_transfer_call` router to vault, a second `ft_on_transfer`, two rollback paths) while the repay leg in a single contract is a plain state change (research R4-R7). With 10 days and one person plus coding agents, the one contract is the only option where the whole money loop can have sandbox tests by Day 4.

### Locked decisions (proposed; become locked only when Candra confirms, see Open questions)
- **D1 Single contract, modules in code.** `router`, `credit`, `vault`, `events`, `admin` as separate Rust files; `credit` is pure functions with unit tests that need no sandbox. One deployed wasm. No per-business sub-accounts (shared router with per-business ledger).
- **D2 Own mock USDC FT** `usdc.<dev>.testnet` built on `near-contract-standards` `FungibleToken`, 6 decimals, a `faucet` method capped per account per day, documented as a stand-in for USDC on mainnet.
- **D3 Credit rules.** One open loan per business. No starter limit: with no routed revenue the limit is 0 and the UI says "route revenue to unlock" (a starter limit is a free sybil drain). Draws pay only owner-curated vendors, up to `max_draw` per loan. Limit = min(advance_bps x trailing 30-day routed revenue, per-business cap) minus owed.
- **D4 Time.** Revenue ledger is a fixed ring of 30 daily buckets keyed by `block_timestamp / 86_400e9`. A demo-only `set_clock_offset_days` and `seed_history` exist behind the cargo feature `demo`; the testnet wasm is built with it, the README says a mainnet build would not.
- **D5 Intents is out of the contract.** There is no Intents testnet (R18). The contract pays vendors with `ft_transfer` (vendor flag `intents: false`). A separate `scripts/intents-proof.ts` pays one real vendor through 1Click on mainnet (about $2) and saves the quote and status JSON plus tx hash for the README. The UI's Intents label is shown only for a vendor that has a recorded proof. If the JWT does not arrive: dry quote screenshot, then documented-only.
- **D6 Demo accounts.** Agent `biz-agent.<dev>.testnet` gets a function-call key limited to `request_draw` on the contract (R14). The simulated customer, the LP and the owner are throwaway testnet accounts with keys supplied through build env (a function-call key cannot attach the 1 yoctoNEAR that `ft_transfer_call` needs, R5/R14). Public keys of throwaway testnet accounts holding only mock tokens are an accepted risk; mock mode is the fallback.
- **D7 App stack: keep the prototype, no Next.js port.** Vite, vanilla ES modules, two HTML entry points (`index.html`, `landing.html`), hash routing as today, JSDoc types on the adapter files. The global AGENTS.md notice about Next.js belongs to the user's home dir, not this repo (no `package.json` here). A React port would cost 2-3 days for no judged gain.
- **D8 Modes.** `mock` (default when `VITE_REVVAULT_CONTRACT` is unset, so `pnpm i && pnpm dev` works offline) and `testnet` (hosted build sets the env). `?net=mock|testnet` overrides. Live mode shows RPC errors as a banner and offers "switch to mock".
- **D9 Reserve.** Recommend `reserve_bps` = 50% of collected fees (reserve is 1.5% of principal) instead of the prototype's 10% (0.3% of principal, cosmetic). It is a config value, so no UI copy changes; the LP APY chip recomputes.
- **D10 Term math fix.** At 25% split a maximum draw does not clear in 30 days (0.412 x R30 owed versus 0.25 x R30 repaid per month, about 49 days). Add: the draw review shows a warning when estimated days to clear exceed the term; past due the effective split steps up to 50% before delinquency; `write_off` only after a grace period (14 days). Delinquency is set by a permissionless `poke(biz)`, no keeper.
- **D11 Track entry.** 04 and 08 always. 01 only if the Intents mainnet proof lands.
- **D12 Hosting.** Static deploy of `web/` (Vercel or GitHub Pages; Vercel skills are available). No server.

## Options considered

| Option | Verdict | Why |
|---|---|---|
| **A. Single contract, modules in code (chosen)** | Recommended | Atomic local accounting, one deploy, one storage, one `ft_on_transfer`, fewest callbacks. Cost: less "architecture story" on the slide. |
| B. Vault + router contracts | Rejected | Cross-contract `ft_transfer_call` on every payment, two rollback paths, debt state split across contracts, double `storage_deposit` registration. Revisit only after the hackathon. |
| C. Router only, vault logic off-chain | Rejected | Not a vault; LP funds would be custodial; fails Track 01 and the "verifiable" claim. |
| App: port to Next.js | Rejected | 2-3 days, no new judged value; AGENTS.md Next.js warning is not about this repo. |
| App: keep prototype, wrap in Vite (chosen) | Recommended | Smallest diff that gives `pnpm dev`, modules, and env-based mode switch. |
| App: stay as a single static HTML file, no bundler | Fallback | Works only with CDN imports for near-api-js; fragile for an offline screener. |
| Intents inside the contract | Rejected | No testnet (R18), JWT lead time unknown (R17), a failure would break the main loop. |
| Intents settler on mainnet as separate proof (chosen) | Recommended | Real evidence, zero coupling. |
| Starter limit for new businesses | Rejected | Sybil drain; contradicts the "only routed revenue counts" claim. |

**Comparison (A versus B)**
| | Impact | Effort in this repo | Risk | Fit with what exists | Reversibility | Scale-ready |
|---|---|---|---|---|---|---|
| A single | same product | 3-4 agent-days | low (one failure surface) | matches contracts-spec "single contract" recommendation | split later is a rewrite but cheap | OK at MVP tier |
| B split | same product | 6-8 agent-days | high (async chains) | adds work not in the build plan | n/a | OK |

**Pre-mortem (it is 15 Nov and this failed; why?)**
1. `ft_on_transfer` gas or callback bug found on Day 8 -> mitigated by sandbox tests on Day 3-4 (gate G1) and a fixed gas budget table in the code.
2. The live demo broke during judging (RPC rate limit, vandalised demo key) -> mock mode default locally, auto-banner in live mode, `seed-testnet` re-creates accounts, pre-recorded video is the primary artifact.
3. A judge catches an overclaim (first-of-its-kind, Intents, yield) -> claims table in `pitch-and-demo.md`; every X claim also lives in README limits.
4. Contract not found runnable by the screener (sandbox download offline, missing toolchain) -> README one-command table, `scripts/warm-sandbox.sh`, `NEAR_SANDBOX_BIN_PATH` documented (R9).
5. Scope creep into wallet connect, relayer, attestation -> frozen on the cut list below; feature freeze 11 Nov EOD.
6. Candra does not know Rust, so reviewing agent output is impossible -> the `credit` module is pure and test-first; every invariant is a named test; Day 11 adversarial review pass with the `code-review` skill.

Red-team note: a multi-voice `party-mode` run was not done (single pass by the planning agent). The attack on the plan found and fixed three things: the clear-in-term math (D10), the wash-routing exposure (answered by the vendor allowlist, residual collusion risk stated), and the cosmetic reserve (D9).

## Spec

### 1. Exact MVP scope

**Must ship (the loop):**
| # | Item | Acceptance |
|---|---|---|
| M1 | Mock USDC FT with faucet | `ft_transfer_call` from a funded account reaches the contract; faucet capped per day |
| M2 | Router pay path (`ft_on_transfer`, `msg={"pay":biz,"ref":..}`) | splits `repay = min(amount x split, debt_left)`, ledger bucket updated, business gets the rest, unknown business refunded, failed business transfer credits `claimable` |
| M3 | Credit views | `get_credit`, `get_loans`, `get_ledger`, `get_vault_stats`, `get_lp`, `get_events`, and `get_snapshot(biz, lp)` returning all of them in one call |
| M4 | `request_draw` | checks status, one open loan, within available and cash, vendor allowlisted, `max_draw`; opens loan then `ft_transfer` to vendor; callback rolls back on failure |
| M5 | Self-repay close | final payment clears dust (no stuck 1-unit debt), loan closes, limit restored |
| M6 | LP | `ft_on_transfer msg=lp_deposit` mints shares at NAV, `lp_withdraw` pays from cash with a clear error when illiquid |
| M7 | Reserve and loss | fee part of each repay splits into LP cash and reserve; `poke` marks delinquent; `write_off` after grace uses reserve first then lowers NAV |
| M8 | Events | NEP-297 logs plus a 100-slot ring read by the UI feed |
| M9 | Tests | `cargo test` passes in one command; invariants in `docs/tech/contracts-spec.md` plus the two below |
| M10 | Seed + demo agent | `scripts/seed-testnet.ts` (accounts, keys, vendor registration, LP deposit, three other borrowers through the real flow, one delinquent via clock offset); `scripts/demo-agent.ts` (sell, draw, repay loop with the fn-call key) |
| M11 | App live mode | every screen of the prototype reads the contract; Pay link, Draw, LP deposit and Demo control actions send real transactions with the demo accounts |
| M12 | README, video, X post, form | see pitch-and-demo.md and the Definition of done |

Deltas to add to `docs/tech/contracts-spec.md` invariants: (7) `token_balance_of_contract >= cash + reserve + claimable_total` (donations are ignored because accounting is internal); (8) an open loan has `repaid <= principal + fee` and a business never has two open loans.

**Cut list, first cut first** (never cut: M1-M6, M8-M9, README, honest limits):
1. Wallet connect (`near-connect`, R12): not in the MVP; demo accounts only. Stretch if Day 11 is clear.
2. Editable repay split in ConstraintsPanel: read-only from config.
3. Real Intents payout: falls to dry-quote evidence, then documented-only (D5). Remove "via NEAR Intents" strings from the UI for vendors without proof.
4. Gasless relayer, Chain Signatures, attested score: already cut; delete any README mention.
5. Live-mode LP deposit/withdraw writes (keep read-only live LP page, writes in mock).
6. `write_off` and reserve consumption (keep delinquent flag and the UI "loss hits reserve first" copy, README says "specified, not implemented"). Last item to cut because the DeFi panel will probe it.
7. Seeded "other borrowers" in live mode (shrink to one).
8. Last resort: ship mock-mode app plus contract with passing tests plus testnet read-only; say exactly that.

### 2. Schedule (revised from `docs/03-build-plan.md`)

| Day | Date | Rust lane (R) | Web lane (W) | Script lane / Candra (S) | Gate |
|---|---|---|---|---|---|
| 1 | Wed 4 Nov (tonight) | `cargo binstall cargo-near near-cli-rs`, hello-world `cargo near build non-reproducible-wasm` on rustc 1.99; warm sandbox binary | none | **Candra: apply for the 1Click Partner Dashboard JWT; create dev testnet account**; re-check bond.credit by eye | G0 toolchain builds |
| 2 | Thu 5 Nov | mock USDC, `credit` pure module + unit tests, storage layout | Vite scaffold, move prototype code to `web/`, extract `adapters/mock.js` to integer micro-USDC, snapshot store, fix the three prototype gaps | X post 1 | |
| 3 | Fri 6 Nov | router pay path, ledger ring, split, claimable, sandbox tests | adapter interface + `adapters/near.js` view calls against a local mock of `get_snapshot` | | |
| 4 | Sat 7 Nov | draw + callbacks + vault/LP + reserve + events ring + `get_snapshot` | live-mode banner, NetworkBadge, error states | | **G1: full loop green in `cargo test`** |
| 5 | Sun 8 Nov | `poke`, `write_off`, demo-only methods, gas budget table | read path wired to deployed contract | testnet deploy, `seed-testnet.ts` v1; X post 2 | **G2: UI shows real testnet numbers** |
| 6 | Mon 9 Nov | hardening from review findings | write path: Pay link, Draw, LP deposit, Demo control | `demo-agent.ts` | |
| 7 | Tue 10 Nov | invariant tests, adversarial review (`code-review` skill) | responsive + polish, est-days warning, past-due split chip | `intents-proof.ts` if JWT present; X post 3 | **G3: demo loop runs live end to end** |
| 8 | Wed 11 Nov | freeze fixes | freeze fixes | README draft, screenshots | **Feature freeze EOD** |
| 9 | Thu 12 Nov | none | deploy static app | record and edit 90 s video, X main post queued (Candra approves) | **G4: video approved** |
| 10 | Fri 13 Nov | none | none | fresh-clone dry run of README on a clean directory, form pre-filled | G5 README passes |
| - | Sat 14 Nov | buffer | buffer | **Submit by 12:00 UTC**, hard limit 23:59 | |

Estimated effort (assumption, not measured): contract about 800-1,000 lines Rust plus 500 lines of tests; adapter and live wiring about 600 lines JS; scripts about 400 lines TS.

### 3. Contract surface (sketch, not an implementation)

```rust
// SKETCH ONLY. Names are proposals; the builder decides exact signatures.
// Config: owner, token, advance_bps=4000, split_bps=2500, fee_bps=300, term_days=30,
//         grace_days=14, per_biz_cap, max_draw, reserve_bps=5000, past_due_split_bps=5000
//
// Receiver:   ft_on_transfer(sender_id, amount, msg) -> PromiseOrValue<U128>
//             msg: {"pay": biz, "ref": str} | {"lp": true}
// Borrower:   request_draw(amount, vendor_id, memo) -> loan_id        // fn-call key target
//             withdraw_claimable()
// LP:         lp_withdraw(shares) -> Promise                          // cash-only
// Anyone:     poke(biz), write_off(loan_id)
// Owner:      set_params, set_vendor(vendor_id, payout_account, label, intents), register_business(biz)
// Demo-only (cfg feature "demo"): seed_history(biz, buckets), set_clock_offset_days(i64)
// Views:      get_snapshot(biz, lp), get_credit, get_loans, get_ledger, get_vault_stats, get_lp, get_events
```

Rounding rules: fee rounds up; repay rounds down except the final payment clears the remainder; shares round down on mint and on burn in the protocol's favour; the first deposit mints 1:1 with a small dead-share offset.

Threat model (short): wash-routing (limit inflation only; vendor allowlist blocks cash-out; routing fee parameter available), colluding vendor (owner curation, residual), donation to skew share price (ignored, internal accounting), reentrancy and promise ordering (state before transfer, rollback in `#[private]` callbacks, R7), callback gas starvation (fixed gas table, tested), rounding and dust (tested), single-asset and single-contract concentration (stated), owner key (stated; multisig for mainnet), demo-only methods (feature-gated, listed in README).

### 4. How the mock UI swaps to real contracts

The adapter interface in `docs/ui/02-component-inventory.md` stays, with four changes forced by the prototype:

1. **Integer money.** Port `S` and `P` from floats to integer micro-USDC (`bigint` or integer strings, formatted only in the UI). Otherwise mock and live numbers disagree on rounding.
2. **Snapshot store.** Renderers stay synchronous because they read one cached snapshot. `store.load()` calls `api.snapshot(biz, lp)`; every action is `await api.action(); await store.load(); render()`. One contract view returns the whole snapshot in a single RPC call, so the UI never shows a torn state.
3. **New interface members:** `snapshot()`, `faucet()`, `advanceClock(days)` (demo only), `network(): 'mock'|'testnet'`, `getVendors()`, and `Credit` gains `effectiveSplitBps`, `dueAt`, `pastDue`.
4. **Vendor labels come from data.** The vendor list carries `{label, network, intents:boolean, proofTx?}`; the prototype's hard-coded "via Intents" strings (the `VENDORS` notes at `index.html:300-304`, the `vendor_paid` text at line 352) become data-driven.

Mapping:
| Interface method | Mock | Testnet |
|---|---|---|
| `snapshot` | moved prototype math | `get_snapshot` view via `JsonRpcProvider` on `https://test.rpc.fastnear.com`, fallback `https://near-testnet.drpc.org` (R13) |
| `requestDraw` | `requestDraw()` | function call `request_draw` signed by the agent fn-call key |
| `routePayment` | `routePayment()` | `ft_transfer_call` on the token from the customer demo account, 100 TGas, 1 yocto |
| `lpDeposit` / `lpWithdraw` | state change | `ft_transfer_call msg lp` / `lp_withdraw` from the LP demo account |
| `advanceClock` | `fastForward()` | owner calls `set_clock_offset_days` then `poke` |
| `getEvents` | in-memory list | `get_events` ring |

Contract ids and keys come from `VITE_*` env at build time; `.env.example` lists the names only.

### 5. Repo layout (sketch)

```
contracts/revvault/      Cargo.toml, src/{lib,router,credit,vault,events,admin}.rs, tests/
contracts/mock-usdc/     Cargo.toml, src/lib.rs
scripts/                 seed-testnet.ts, demo-agent.ts, intents-proof.ts, warm-sandbox.sh
web/                     package.json, vite.config, index.html, landing.html,
                         src/{app.js, store.js, adapters/{types.js,mock.js,near.js}, views/*}
prototype/               untouched, kept as the reference until web/ matches it
README.md                one-command table, honest limits, contract ids, track mapping
```

One-command table the README must carry: `pnpm i && pnpm dev` (mock app), `cargo test` (contracts, first run downloads the sandbox binary), `pnpm seed:testnet` (needs keys, optional), `pnpm demo:agent` (optional).

## Out of scope
Wallet connect (stretch only), gasless relayer, Chain Signatures, attested history score, per-business sub-accounts, LP tranches, withdrawal queue, multi-loan per business, router refunds, routing fee other than 0, light theme, mainnet USDC, a mainnet deployment of the contract, any claim of audit or legal compliance, any change to `prototype/` files in the planning phase.

## Open questions
Because no user was reachable, these are the questions the caller must ask Candra. Recommended answer first.

| # | Question | Recommended | Blocks |
|---|---|---|---|
| Q1 | Who writes the Rust and reviews it: coding agents with Candra reviewing, or does a teammate join? Team size for the form? | Agents write, Candra reviews tests, solo or 2 on the form | Day 2 start |
| Q2 | Confirm D7: keep the prototype, wrap in Vite, no Next.js port? | Yes | Web lane |
| Q3 | Confirm D6: embedded throwaway demo keys in the hosted live mode (agent fn-call key plus customer/LP full-access testnet keys)? | Yes, mock is the fallback | Seed and live writes |
| Q4 | Confirm D9/D10: reserve 50% of fees, past-due split 50%, 14-day grace, no starter limit? | Yes | Contract params |
| Q5 | Enter Track 01 too (D11)? | Only if the Intents proof lands | README, form |
| Q6 | Re-check bond.credit by eye: does it list NEAR today? Earlier session said yes, today's read said no (R-C1) | Check before any public sentence about it | Pitch wording |
| Q7 | Is the 1Click Partner Dashboard JWT obtainable quickly (R17)? Apply tonight | Apply tonight | Intents proof |
| Q8 | Routing fee: keep 0 in MVP or set a few bps to price out wash-routing? | 0 now, parameter exists | Pitch Q&A 2 |
| Q9 | Which public repo name and org for the README and X post? | `revvault-rwa` under Candra's public org | README, X |
| Q10 | Hosting target for the static app: Vercel or GitHub Pages? | Vercel | Day 9 |

## Tooling
- **Installed**: Rust 1.99.1 with `wasm32-unknown-unknown` and `wasm32v1-none` targets, node 26, pnpm, `cargo-binstall`, `cargo-audit` (found by listing `~/.cargo/bin` and `rustc --version`, 2026-11-04). Skills available in this environment that apply: `code-review` (Day 7 adversarial pass), `x-post` (post drafts, Buffer veto), `dataviz` (chart palette check), `vercel:deploy`.
- **Recommended, not installed (exact commands, for the Rust lane on Day 1; nothing was installed by the planning agent):**
  - `cargo binstall cargo-near` (docs build path, R3)
  - `cargo binstall near-cli-rs` (docs name it as the CLI; confirm the crate name on install, the quickstart cited version 0.22)
  - `pnpm add near-api-js @hot-labs/near-connect` in `web/` (near-connect only if the wallet stretch is pursued, R12)
  - `pnpm add @defuse-protocol/one-click-sdk-typescript` in `scripts/` (R21)
- **Rejected**: no NEAR-specific skill or MCP server was searched for in this session (planning agents could not install anyway); the docs-based flow above is enough. No project skill is proposed: the project is a 10-day sprint and this file plus the handoff prompts carry the invariants.
- **Needs the user**: a funded dev testnet account (faucet), the Partner Dashboard JWT application, the public GitHub repo, approval before any X post is queued.

## Evidence
See [research.md](./2026-11-04-revvault-10-day-plan/research.md). The research subagents read pages through WebFetch summaries (a small model), so specifics such as exact numbers and the status-by-deposit-address path are labelled medium confidence there. Not verified: Intents JWT lead time and rate limits, minimum quote amounts, a documented total gas for the `ft_transfer_call` chain (the Day 3 sandbox tests establish it), NEP-145 `storage_deposit` rules, whether `cargo near build` works on rustc 1.99.1, Roke.to, Clipstake, bond.credit on NEAR.

Assumptions (separate from evidence):
- Candra plus coding agents, no dedicated Rust author (Q1). **Riskiest assumption: the Partner Dashboard JWT arrives in time**; the plan survives without it.
- Public testnet RPC stays up for the judging window.
- The screener prefers a one-command mock mode plus a visible live testnet path.
- The effort estimates are guesses.

## Handoff
- **Agent**: Rust lane `general-purpose` (load nothing chain-specific; instruct it to read the NEAR docs cited in research.md). Web lane `work:frontend`. Script lane `general-purpose` after G2. Candra dispatches; the planning agent does not.
- **Prompts (ready to paste; run only after Candra answers Q1-Q4)**

**Rust lane**
```
@agent-general-purpose Read /home/cn/Projects/Competition/Web3/NEAR/revvault-rwa/docs/brainstorm/2026-11-04-revvault-10-day-plan.md, then its companion folder (architecture.md, research.md, pitch-and-demo.md), then docs/tech/contracts-spec.md. Build contracts/revvault and contracts/mock-usdc exactly as the plan's Spec sections 1, 3 and 5 say (single contract, modules router/credit/vault/events/admin, near-sdk 5.30, near-workspaces 0.24). Day 1: install cargo-near and near-cli-rs, build a hello contract with `cargo near build non-reproducible-wasm`, warm the sandbox binary. Then test-first: pure `credit` unit tests, then sandbox tests for M2, M4, M5, M6, M7 and invariants 1-8. Gate G1: `cargo test` passes in one command with the full loop (pay, draw, self-repay, close, LP in/out, delinquency, write-off, failed-transfer rollback). Rules: state updated before outgoing transfers and rolled back in #[private] callbacks; accounting from internal counters, never ft_balance_of; demo-only methods behind cargo feature `demo`; do not touch prototype/ or the existing docs. Report the measured gas for ft_transfer_call chains in a markdown note under docs/tech/gas-notes.md.
```

**Web lane**
```
@agent-work:frontend implement the Web lane of /home/cn/Projects/Competition/Web3/NEAR/revvault-rwa/docs/brainstorm/2026-11-04-revvault-10-day-plan.md (read it and its companion folder first; Status is draft until Candra confirms Q2, ask him first). Create web/ as a Vite vanilla multi-page app from prototype/index.html and prototype/landing.html (prototype/ stays untouched). Steps: (1) move the S/P/routePayment/requestDraw/fastForward code into src/adapters/mock.js using integer micro-USDC; (2) add src/adapters/types.js (JSDoc RevVaultApi incl. snapshot, faucet, advanceClock, network, getVendors) and src/store.js (async load, synchronous render from snapshot); (3) fix the three prototype gaps listed in pitch-and-demo.md section 3 (add Customer pays 1000 button and correct the suggested-take sentence, disable Draw while a loan is open, est-days warning when clear time exceeds the term, past-due chip showing the stepped-up split); (4) make vendor labels data-driven so "via NEAR Intents" shows only for vendors with a proof; (5) add NetworkBadge with mock/testnet and the demo-clock marker. Later, once contracts exist: src/adapters/near.js with JsonRpcProvider (https://test.rpc.fastnear.com, fallback https://near-testnet.drpc.org) and signed calls using VITE_* env keys. Use the work:reuse-first skill. `pnpm i && pnpm dev` must run in mock mode with no env.
```

**Script lane (start at G2)**
```
@agent-general-purpose Read the plan at /home/cn/Projects/Competition/Web3/NEAR/revvault-rwa/docs/brainstorm/2026-11-04-revvault-10-day-plan.md. Write scripts/seed-testnet.ts (create accounts, add the agent function-call key limited to request_draw, register vendors with storage_deposit, faucet and LP deposit, three other borrowers through the real flow, one delinquent via set_clock_offset_days then poke, idempotent re-runs), scripts/demo-agent.ts (sell, check available, request_draw, watch loan; honours max_draw), and, only if a 1Click JWT exists in the environment, scripts/intents-proof.ts (dry quote first, then a ~$2 mainnet payout, save quote and status JSON and tx hash under docs/proof/). Never print or commit keys; .env.example lists names only.
```

- **Acceptance criteria**:
  - [ ] G0: `cargo near build non-reproducible-wasm` produces a wasm on this machine
  - [ ] G1: `cargo test` passes in one command, covering M2, M4-M7 and invariants 1-8
  - [ ] G2: the app in testnet mode shows real `get_snapshot` numbers and tx links
  - [ ] G3: Pay link, Draw and Demo control run the full loop live with no wallet pop-ups; mock mode still works
  - [ ] No UI string claims Intents, yield, audit or "first" without proof (checked against the claims table in pitch-and-demo.md)
  - [ ] README has the one-command table, honest limits (incl. seeded history, mock USDC, owner key, not audited), contract ids, track mapping
  - [ ] 90 s video follows the script in pitch-and-demo.md section 3, X main post uses the required tags
  - [ ] Fresh-clone dry run of the README passes on a clean directory before 13 Nov EOD
- **References**: [docs/ui/02-component-inventory.md](../ui/02-component-inventory.md) (adapter), [docs/tech/contracts-spec.md](../tech/contracts-spec.md), [docs/research/02-novelty-and-risks.md](../research/02-novelty-and-risks.md), NEAR docs and Intents docs URLs in research.md.
