# contracts.md — everything that crosses a role boundary

Roles build against this file, not against each other's code. If you need a change, report it to the PM; do not diverge. Source of truth for behaviour: docs/tech/contracts-spec.md, amended by docs/research/05-synthesis.md. Where they differ, this file wins.

Roles (2026-11-08 plan): **R1** contracts and the `underwriting` crate, **R2** UI (restyle in `prototype/`, copy pass, Vite wrap in `web/`), **R3** demo agent, `underwrite` CLI, seed/deploy scripts, Intents dry quote, **R4** submission (README, Makefile, root non-Rust files).

**Authority.** `docs/brainstorm/2026-11-08-prd-alignment.md` is the single plan. Section 0 below applies it to this file and wins over every later section where they differ. Sections 1-15 are kept for the parts that did not change.

## 0. Amendments of 2026-11-08 (win over sections 1-15)

**Parameters.** `repay_share_bps_default` 2000; `loan_term_ns` 60 days; `reserve_bps` 5000; `starter_limit` 0; `advance_bps_agent` 4000; `advance_bps_creator` 3000; `grace_days` 14; `past_due_split_bps` 5000 (past due plus grace: future split is `max(current, 5000)`); `attestor_pk` optional (P1). Fee stays flat 3% rounded up. Limit: `min(routed_trailing x advance_bps_for(kind), per_biz_cap)`; `routed_trailing == 0` gives limit 0.

**Kind.** `enum Kind { Agent, Creator }`. `register_business({kind})` (self-service, requires no deposit; idempotent; kind immutable after first registration except by owner). A first routed payment to an unregistered biz registers it as `Agent`. `advance_bps_for(kind)` as above. `get_credit` additionally returns `kind: "agent"|"creator"`, `effective_split_bps`, `due_at_ms: number|null`, `past_due: bool`, `attested: bool`, `est_days_to_clear: number|null` (computed from the trailing daily routed average and the effective split; null when no open loan or no revenue).

**Revenue notes (NEP-171, in the revvault contract).** One note per loan, `token_id == loan id` (`ln_001`). Minted to the vault account (`env::current_account_id()`) in `request_draw` when the loan opens; burned and the loan voided if the vendor transfer fails (`on_vendor_paid` failure branch), so no orphan note exists. Each repaid slice increments `Note.repaid`; at `repaid == principal + fee` status becomes `Settled` (note kept, not burned). On write-off after grace the status becomes `WrittenOff`. Methods: `nft_token({token_id})`, `nft_total_supply()`, `nft_tokens({from_index?, limit?})`, `nft_supply_for_owner({account_id})`, `nft_tokens_for_owner({account_id, from_index?, limit?})`, `nft_metadata()` (name "RevVault revenue note", symbol "RVNOTE"), and `nft_transfer` / `nft_transfer_call` which always panic with `"notes are pool-held in this MVP"`. Mint event follows NEP-171 (`standard: "nep171"`, event `nft_mint`). Views: `get_notes({account?, kind?, status?})` and `get_note({id})` returning `Note = {id, business, kind, holder, principal, fee, repaid, repay_share_bps, minted_at_ms, due_at_ms, status: "open"|"settled"|"past_due"|"written_off", vendor, memo}`. `get_loan(s)` stay.

**LP share token rvUSDC (NEP-141, same contract).** Symbol `rvUSDC`, 6 decimals. P1 target: `ft_balance_of`, `ft_total_supply`, `ft_metadata`, `ft_transfer` backed by near-contract-standards `FungibleToken`, auto-register receivers on mint. `ft_on_transfer` (receiver for mock USDC) and the share token's `ft_transfer` must not collide: the share token never implements `ft_transfer_call`. Fallback if it slips: read-only `ft_balance_of`, `ft_total_supply`, `ft_metadata` over the internal map, and all UI/README copy says "share ledger", not "token". `lp_withdraw({shares})` stays.

**Write-off and poke.** `poke({biz})` (anyone): if `now > due_at` marks delinquent/past due and applies the step-up; if `now > due_at + grace_days` writes the loan off (reserve first, then NAV absorbs); idempotent. `mark_delinquent` stays for the owner.

**Attestation (P1).** `post_attestation({payload, signature})`, payload `{biz, advance_bps, valid_until_ms, nonce}` canonical JSON, ed25519 signature checked with `env::ed25519_verify` against `attestor_pk`; clamp `advance_bps` to `[base_for_kind, base_for_kind + 2000]`; reject expired or reused nonce. It never adds revenue and never creates a starter limit. Cut-line item 3: if not built, the CLI still prints the attestation and every UI string says "specified, not enforced on-chain".

**Events added.** `note_minted {id, biz, kind, principal, fee, holder}`, `note_settled {id}`, `note_written_off {id}`, `business_registered {biz, kind}`, `attestation_applied {biz, advance_bps}`; plus the NEP-171 `nft_mint` event under `standard: "nep171"`. `business_delinquent` becomes `loan_past_due`; keep the old name as an alias is not required (nothing is built).

**Added invariants (enforced in code and checked by self-review; no tests are written, owner instruction 2026-11-08).** (7) every open loan has exactly one note, held by the vault; (8) `ft_total_supply == total_shares` (or the share ledger sum); (9) a settled note has `repaid == principal + fee`; (10) no attestation can lift the limit above `routed x (base + 2000 bps)`; (11) a failed vendor transfer leaves no note and restores cash.

**Golden vector at the new defaults.** Seed 30 days routed = 2,400, cash 21,500, split 2000, kind agent: limit 960; draw 500, fee 15, debt 515, note `ln_001` open; payments 500/1000/1500 give repay 100/200/215, debt_left 415/215/0, note Settled, limit 2,000. Creator vector: biz kind creator, routed 2,400 gives limit 720 (30%).

**Mock USDC, vendors, env names, make targets, routes.** Sections 7, 10, 12, 13 stand with these changes. Routes (section 14) are void: the app is a Vite multi-page wrap in `web/` that keeps the prototype's hash routes (`#/business`, `#/loans`, `#/pay`, `#/activity`, `#/lp` shown as "Notes and Vault", `#/demo`). Env names use the `VITE_` prefix instead of `NEXT_PUBLIC_`: `VITE_REVVAULT_MODE` (mock default), `VITE_NEAR_NETWORK`, `VITE_NEAR_RPC_URL`, `VITE_REVVAULT_CONTRACT_ID`, `VITE_USDC_CONTRACT_ID`, `VITE_DEMO_BUSINESS_ID`. Section 9 (TS engine) and the `app/` paths map to `web/src/lib/`. The adapter (section 8) gains `Kind`, `Note`, `getNotes`, `getNote`, `snapshot()`, `network()` and `Credit` gains `kind`, `effectiveSplitBps`, `dueAtMs`, `pastDue`, `attested`, `estDaysToClear`.

**Underwriting crate.** `contracts/underwriting/` pure Rust, no near-sdk: `score(inflows: &[Inflow], routed_share) -> Score {advance_bps, cap, components}` plus the shared `limit()`/`est_days_to_clear()` used by the contract. Golden vectors in `contracts/fixtures/underwriting-vectors.json`. The CLI in `tools/underwrite/` (owner R3) depends on it by path.

**Intents.** No testnet. UI says "via NEAR Intents" only for a vendor whose record carries a proof; otherwise "Direct FT (testnet)". The mainnet dry-quote script writes `deployments/intents-preview.json` (section 11); no JWT is assumed; never claim a testnet Intents payout.

## 1. Units, ids, conventions
- Token: mock USDC, 6 decimals, NEP-141. On the wire (JSON) every amount is a decimal **string** of the smallest unit (`"500000000"` = 500 USDC). Rust uses `U128`. TypeScript uses `bigint` internally and `Amt = string` at the adapter boundary. Never floats for money.
- Time: contract uses `block_timestamp` in nanoseconds. JSON views return **milliseconds** as numbers (`atMs`) so the UI needs no conversion; the contract divides by 1_000_000.
- Rates are basis points (`bps`, 10_000 = 100%).
- Contract account ids: `revvault.<deployer>.testnet`, `usdc.<deployer>.testnet`. Real ids are written by R3's deploy script to `deployments/testnet.json` (owner R3, committed after deploy) and copied into README by R4. Never invent ids.

## 2. Default parameters (Config, set at `new`, owner-adjustable via `set_params`)
| Param | Value | Note |
|---|---|---|
| `advance_rate_bps` | 4000 | limit = min(trailing × rate, cap) |
| `per_biz_cap` | 2_000_000_000 (2,000 USDC) | |
| `starter_limit` | 0 | no starter limit; `trailing_revenue == 0` means limit 0 |
| `fee_bps` | 300 | flat fee on principal at draw |
| `loan_term_ns` | 60 days | see section 0 |
| `window_days` | 30 | rolling daily buckets |
| `repay_share_bps_default` | **2000** | 20%; bounds [1000, 9000] |
| `reserve_bps` | 5000 | share of each repaid fee kept as first-loss reserve |
| `token` | mock USDC account | `ft_on_transfer` rejects any other predecessor |

## 3. Contract `revvault` — public methods
All JSON args are objects. Amounts are strings.

**Receiver**
- `ft_on_transfer(sender_id, amount, msg) -> PromiseOrValue<U128>` (returns unused amount). `predecessor_account_id` must equal `token`, else panic. `msg` is JSON:
  - `{"action":"lp_deposit"}` mints LP shares at current NAV; emits `lp_deposit`.
  - `{"action":"pay","biz":"<account id>","ref":"<string ≤ 64 chars>"}` routes revenue (see §4).
  - Anything else or unparseable: return the full `amount` (refund), no panic.
  - A payer must hold the token and call `ft_transfer_call` on the token with 1 yoctoNEAR; function-call keys cannot do this (documented, expected).

**Business** (caller must be the business account or its function-call key; no deposit attached)
- `request_draw({amount, vendor, memo}) -> loan id (string)` — checks §4 rules, opens the loan, calls `ft_transfer(vendor, amount)` on the token, finalises in `on_vendor_paid` callback or voids on failure.
- `set_repay_share({bps})` — within bounds; only an increase while a loan is open.

**LP**
- `lp_withdraw({shares}) -> U128` — pays `min(value, cash)` via `ft_transfer`; if `value > cash` it **panics** with `"insufficient liquidity: available <amt>"` (no queue; queue is cut-list P2).

**Admin (owner only)**
- `set_params({...})`, `pause_business({biz})`, `mark_delinquent({biz})`.
- `mark_delinquent` is also callable by anyone once `now > due_at` with debt outstanding (so a keeper or the demo can trigger it); it is idempotent.
- Test/demo helper: `demo_advance_days({days})` exists **only behind cargo feature `demo-time`**, off in the testnet deployment unless R3 enables it for a labelled demo build; it shifts the contract's notion of "now" (stored offset). Document in README if used. Time travel in tests uses `fast_forward`.

## 4. Rules and math (R1 implements; R2's TS engine and R3's mock mirror it; fixtures enforce it)
- `trailing = Σ buckets in last window_days` (daily bucket = `floor(block_ts / 1 day)`).
- `limit = trailing == 0 ? starter_limit : min(trailing × advance_rate_bps / 10_000, per_biz_cap)`.
- `debt_left = principal + fee − repaid`; `available = status == Active ? max(0, limit − debt_left) : 0` (if a loan is open the limit is checked against `debt_left`).
- Draw: `fee = principal × fee_bps / 10_000` (round **up**, protocol's favour); require `amount ≤ available`, `amount ≤ vault cash`, status Active, no pending draw, vendor non-empty. One open loan per business in MVP.
- Payment: `repay = min(amount × repay_share_bps / 10_000 (round up), debt_left)`; `to_business = amount − repay`. State is updated **before** the outgoing `ft_transfer` to the business; a `#[private]` callback reverts exactly on failure and returns the full `amount` as unused so the token refunds the payer. If `to_business == 0`, return `Value(0)`. Revenue (full `amount`) is credited to the bucket regardless of loan state.
- Fee accounting: each repaid unit is split fee-part vs principal-part proportionally; `reserve += fee_part × reserve_bps / 10_000`; the rest of the fee raises vault NAV.
- LP NAV: `total_assets = cash + outstanding principal`; shares minted `amount × total_shares / total_assets` (first deposit 1:1).
- Delinquent when `now > due_at && debt_left > 0`: limit 0, draws blocked, future `repay_share` bumped to `max(current, 5000)`. A loan closes the moment `debt_left == 0`; status returns to Active if it was not paused.
- Required invariants (enforced in code and covered by R1's written self-review; no tests are written, owner instruction 2026-11-08): (1) `cash + outstanding_principal + reserve + fees_retained == tracked token balance`; (2) `repay ≤ debt_left` and `to_business + repay == amount`; (3) `available ≥ 0`, draw never exceeds cash; (4) 1-unit payments do not underflow; (5) failed vendor/business transfer reverts state; (6) delinquent business cannot draw.

### Worked example (the golden demo vector, R1 puts it in `contracts/fixtures/math-vectors.json`)
Seed: biz `biz-agent.testnet`, 30 daily buckets summing to 2,400 USDC, vault cash 21,500, split 2000 bps, no loan.
1. `limit = min(2,400 × 0.4, 2,000) = 960`; `available = 960`.
2. `request_draw(500)` → `fee = 15`, `debt = 515`; `available = 445`; vendor receives 500.
3. Pay 500: repay 100, to_biz 400, debt_left 415. Pay 1,000: repay 200, to_biz 800, debt_left 215. Pay 1,500: repay `min(300, 215) = 215`, to_biz 1,285, debt_left 0 → `loan_closed`.
4. Trailing = 2,400 + 3,000 = 5,400 → limit `min(2,160, 2,000) = 2,000`; available 2,000 (limit grew from 960).

## 5. Views (all `&self`)
| Method | Returns |
|---|---|
| `get_credit({account})` | `{limit, available, outstanding, trailing_revenue, advance_rate_bps, repay_share_bps, status: "active"\|"delinquent"\|"paused", no_history: bool}` |
| `get_loans({account})` | `Loan[]` newest first |
| `get_loan({id})` | `Loan \| null` |
| `get_ledger({account, days})` | `{day: "YYYY-MM-DD", amount}[]` oldest first |
| `get_vault_stats()` | `{tvl, cash, reserve, utilisation_bps, illustrative_apy_bps, open_loans, delinquent, total_shares}` |
| `get_lp({account})` | `{shares, value, earned}` (`earned` = value − deposited) |
| `get_recent_events({account?, limit?})` | **P1.** `Event[]` from an on-chain ring buffer of the last 50 events (the contract stores them in addition to logging). Until it exists, testnet mode shows events the adapter itself produced in this session and mock mode shows seeded events. |
| `get_params()` | Config |

`Loan = {id, business, vendor, principal, fee, repaid, opened_at_ms, due_at_ms, memo, status: "open"\|"closed"\|"delinquent"}`.
`illustrative_apy_bps = fee_bps / 10_000 / 30 × 365 × utilisation × (1 − reserve_bps/10_000)` in bps, always labelled "Illustrative".

## 6. Events (NEP-297, `standard: "revvault"`, `version: "1.0.0"`)
Logged as `EVENT_JSON:{"standard":"revvault","version":"1.0.0","event":"<name>","data":{...}}`.
Names and data: `payment_routed {biz, payer, amount, ref}`, `repay_applied {biz, loan_id, amount, debt_left}`, `draw_opened {biz, loan_id, amount, fee, vendor, memo}`, `vendor_paid {loan_id, vendor, amount, route: "direct-ft"}`, `vendor_failed {loan_id}`, `loan_closed {biz, loan_id}`, `lp_deposit {account, amount, shares}`, `lp_withdraw {account, amount, shares}`, `business_delinquent {biz, loan_id}`.
`route` is always `"direct-ft"` on testnet. The word "Intents" never appears in contract events.

## 7. Mock USDC contract `mock-usdc`
NEP-141 + NEP-145 (`storage_deposit`) via near-contract-standards `FungibleToken`, metadata `symbol "USDC"`, `decimals 6`, plus open `mint({account_id, amount})` (testnet faucet; capped at 10,000 USDC per call). Accounts that touch it must call `storage_deposit` first (vault, business, vendor, LPs, payers). R3's seed script does this.

## 8. TypeScript adapter (R2 owns `app/lib/api/types.ts`; R3 imports types read-only)
```ts
type Amt = string
type Mode = 'mock' | 'testnet'
type Status = 'active' | 'delinquent' | 'paused'
type EventType = 'payment_routed'|'repay_applied'|'draw_opened'|'vendor_paid'|'loan_closed'|'lp_deposit'|'lp_withdraw'|'business_delinquent'
interface Credit { limit: Amt; available: Amt; outstanding: Amt; trailingRevenue: Amt; advanceRateBps: number; repayShareBps: number; status: Status; noHistory: boolean }
interface Loan { id: string; business: string; vendor: string; principal: Amt; fee: Amt; repaid: Amt; openedAtMs: number; dueAtMs: number; memo: string; status: 'open'|'closed'|'delinquent' }
interface RevenueBucket { day: string; amount: Amt }
interface VaultStats { tvl: Amt; cash: Amt; reserve: Amt; utilisationBps: number; illustrativeApyBps: number; openLoans: number; delinquent: number }
interface Event { id: string; type: EventType; tsMs: number; amount?: Amt; ref?: string; tx?: string; loanId?: string; route?: 'direct-ft'|'mock' }
interface RevVaultApi {
  mode: Mode
  getCredit(acct: string): Promise<Credit>
  getLoans(acct: string): Promise<Loan[]>
  getLoan(id: string): Promise<Loan | null>
  getLedger(acct: string, days: number): Promise<RevenueBucket[]>
  getVaultStats(): Promise<VaultStats>
  getLp(acct: string): Promise<{ shares: Amt; value: Amt; earned: Amt }>
  getEvents(acct?: string): Promise<Event[]>
  requestDraw(i: { amount: Amt; vendor: string; memo: string }): Promise<{ loanId: string; tx: string }>
  setRepayShare(bps: number): Promise<{ tx: string }>
  routePayment(i: { biz: string; amount: Amt; ref: string }): Promise<{ tx: string; repaid: Amt; toBiz: Amt }>
  lpDeposit(amount: Amt): Promise<{ tx: string }>
  lpWithdraw(shares: Amt): Promise<{ tx: string }>
  demo?: { fastForward(days: number): Promise<void>; reset(): Promise<void> }
}
```
Mode selection: `NEXT_PUBLIC_REVVAULT_MODE` unset or `mock` → in-memory adapter (+ localStorage); `testnet` → RPC adapter. The default with no env must be mock. `demo` exists only in mock mode (and in testnet only if the `demo-time` build is deployed).

## 9. Engine (R2 owns `app/lib/engine/`, pure TS, no React/Next/DOM imports)
Exports: `creditLimit`, `available`, `quotePayment`, `applyPayment`, `quoteDraw`, `applyDraw`, `fastForward`, `seedState`, `vaultStats`. State and functions use bigint. Imported by `app/lib/api/mock.ts` and, read-only, by `scripts/agent` via a relative path. The fixture `contracts/fixtures/math-vectors.json` documents the expected numbers (no test code; owner instruction 2026-11-08) (format: `[{name, params, state, action, expect}]`, amounts as strings).

## 10. Vendors and payout labelling
Seed vendors: `GPU-Provider`, `LLM-API`, `Data-Feed`, each a testnet account registered on mock USDC (ids in `deployments/testnet.json`). The UI vendor list shows asset/network as **"USDC on NEAR (testnet)"** in testnet mode. In mock mode the receipt reads "Paid (mock)". The strings "via NEAR Intents" or "USDC on Base via Intents" may only render inside a block explicitly labelled "Mainnet quote preview — no funds moved".

## 11. Intents preview artifact (R3 writes, R2 renders optionally)
`deployments/intents-preview.json`: `{generatedAt, mainnet: true, noFundsMoved: true, tokensCount, quote: {originAsset, destinationAsset, amountIn, amountOut, fee?, etaSeconds?, dry: true} | null, error: string | null}`. If the quote call fails, `quote` is null and `error` holds the message; consumers show "Preview unavailable".

## 12. Environment variable names (no values anywhere in the repo)
Browser-readable: `NEXT_PUBLIC_REVVAULT_MODE` (mock|testnet), `NEXT_PUBLIC_NEAR_NETWORK` (testnet), `NEXT_PUBLIC_NEAR_RPC_URL` (default `https://test.rpc.fastnear.com`), `NEXT_PUBLIC_REVVAULT_CONTRACT_ID`, `NEXT_PUBLIC_USDC_CONTRACT_ID`, `NEXT_PUBLIC_DEMO_BUSINESS_ID`.
Scripts only (never `NEXT_PUBLIC_`): `NEAR_DEPLOYER_ACCOUNT_ID`, `NEAR_DEPLOYER_PRIVATE_KEY`, `AGENT_ACCOUNT_ID`, `AGENT_PRIVATE_KEY`, `VENDOR_ACCOUNT_ID`, `ONECLICK_API_KEY` (optional), `ONECLICK_BASE_URL` (default `https://1click.chaindefuser.com`).
Roles request new names via `docs/handoffs/DEPS.md`; R4 edits `.env.example`.

## 13. Make targets (R4 owns the Makefile; names are fixed; recipes call R3's scripts)
`make setup`, `make check` (= `cargo check --workspace --locked` and `cargo clippy`), `make demo`, `make agent`, `make verify`, `make deploy`, `make seed`, `make agent-testnet`, `make env`. `make setup`, `cargo check`, `make demo`, `make agent` need **no env vars, no wallet, no keys**.

## 14. Routes (R2)
`/` landing, `/app/business`, `/app/business/draw` (modal over business), `/app/loans`, `/app/loans/[id]`, `/app/activity`, `/app/lp`, `/pay/[bizId]`, `/demo`. `/demo` is hidden from nav, linked from README and landing footer. Prototype hash routes (`#/business`, `#/demo`, `#/lp`) are replaced by these.

## 15. Honesty constraints (every handoff repeats these; UI copy and README must obey)
1. Only routed revenue counts as collateral.
2. Meta Transactions do not redirect revenue.
3. Positioning (owner decision 2026-11-08): the PRD's "first" framing is kept, worded as the PRD words it: "berpotensi first-of-its-kind", "belum ditemukan di ekosistem/dApps publik". Never state it as proven fact, never claim no competitor exists, never cite the Colosseum or Ping Subscription claims as verified. bond.credit lists NEAR and stays in the competitor table.
4. APY is illustrative; never a promise of yield.
5. Repayment is economic, not legal.
6. The demo uses mock data until contracts are wired; the UI shows Mock / Testnet and never blurs them.
7. Revenue notes are economic claims recorded in the contract, pool-held in the MVP, not securities, not transferable. The history score sets the rate only, never the collateral. Creator income counts only if routed through the pay link.
Also: testnet only, unaudited, mock USDC is not money; NEAR Intents has no testnet, so testnet vendor payout is a direct FT transfer and Intents appears only as a labelled mainnet quote preview.
