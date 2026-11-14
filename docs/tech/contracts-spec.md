> Draft v0. R1 refreshes this at the end to match what is built; until then `docs/handoffs/contracts.md` section 0 is authoritative (notes, Kind, rvUSDC, split 20%, term 60, reserve 50%).

# Contracts spec (draft v0)

Units: all amounts are u128 in the stablecoin's smallest unit (assume 6 decimals). Time in nanoseconds (NEAR block_timestamp).

## State
```
Config { owner, token: AccountId, advance_rate_bps, per_biz_cap, repay_share_bps_default,
         fee_bps, loan_term_ns, window_ns, reserve_bps }
Vault { total_shares, total_assets (cash + outstanding principal), cash, reserve }
LP    { shares }   // map AccountId -> u128
Business { registered_at, revenue_buckets (rolling daily buckets), outstanding_principal,
           outstanding_fee, repay_share_bps, status: Active|Delinquent|Paused, attested_boost? }
Loan { id, business, vendor, principal, fee, repaid, opened_at, due_at, memo, status }
```

## Methods
**LP**
- `ft_on_transfer(sender, amount, msg="lp_deposit")` -> mint shares at current NAV.
- `lp_withdraw(shares)` -> pays out `min(value, cash)`; if illiquid, partial/queued (MVP: reject with clear error, UI shows "available liquidity").

**Business**
- `register_business()` -> create ledger entry (could be implicit on first payment).
- `ft_on_transfer(sender, amount, msg='{"pay":"biz-agent.testnet","ref":"inv_123"}')` -> router path: split, update ledger, emit event.
- `request_draw(amount, vendor, memo)` -> checks, opens Loan, pays vendor. (Called with a function-call key; no deposit.)
- `set_repay_share(bps)` -> within [min, max] bounds; only increases while loan outstanding.

**Views**
- `get_credit(account) -> { limit, available, outstanding, trailing_revenue, advance_rate, status }`
- `get_loans(account)`, `get_vault_stats() -> { tvl, utilization, cash, reserve, apy_illustrative, loans_open, delinquent_count }`
- `get_ledger(account, from, to)` -> revenue buckets for charts.
- `get_lp(account) -> { shares, value, earned }`

**Admin**
- `set_params`, `pause_business`, `post_attestation(sig, payload)` (optional).

## Events (NEP-297 style JSON logs) - UI timeline reads these
`payment_routed`, `repay_applied`, `draw_opened`, `vendor_paid`, `loan_closed`, `lp_deposit`, `lp_withdraw`, `business_delinquent`.

## Math
- `trailing = sum(buckets in last window)`; `limit = min(trailing * advance_rate/1e4, per_biz_cap)`; `available = limit - outstanding_principal - outstanding_fee`.
- Draw: `fee = principal * fee_bps/1e4`; debt = principal + fee.
- Payment split: `repay = min(amount * repay_share/1e4, debt_left)`; `to_business = amount - repay`.
- LP NAV: `shares_value = total_assets * lp_shares / total_shares`; fees repaid raise `total_assets`; reserve share (`reserve_bps` of fees) is first-loss.

## Invariants to test
1. `cash + outstanding + reserve == sum of tracked token balance` (no leakage).
2. `repay <= debt_left`; `to_business + repay == amount`.
3. `available >= 0`; a draw never exceeds pool cash.
4. Dust and rounding: 1-unit payments don't underflow.
5. Failed outgoing transfer (vendor/business) -> state reverted via callback.
6. Delinquent business cannot draw.

## Testing approach
`near-workspaces` (Rust) sandbox tests: happy path, partial repay, multi-draw, delinquency, LP in/out, rounding. These double as README "it works" evidence for the Claude Code/Codex screener: `cargo test` must pass in one command.

## Open design choices (decide before coding)
- Single contract vs vault+router. Recommendation: single contract, modules.
- Fee flat vs APR. Recommendation: flat.
- LP tranches (senior/junior) as stretch only.

---

# As built (R1, 2026-11-08) — supersedes the draft above

Authority: `contracts/INTERFACE.md` lists every method, view shape and event. Parameters: advance 40% agent / 30% creator, cap 2,000 USDC, no starter limit, fee 3% rounded up, split 20%, term 60 days, grace 14 days, past-due split 50%, reserve 50% of collected fees.

Design: one `revvault` contract; a note is the loan record (token id equals loan id, owner always the vault), so "one open loan, one note" holds by construction. `underwriting` is a pure crate used for `limit`, `fee_up`, `repay_slice`, `fee_part`, `est_days_to_clear`, `clamp_attested_bps`, `score`. rvUSDC is a NEP-141 subset backed by near-contract-standards `FungibleToken` (no `ft_transfer_call`).

Accounting: `cash` and `reserve` are token balances held by the vault; `outstanding` is lent principal. `fees_retained` and `fees_to_reserve` are cumulative counters, already inside `cash` and `reserve`. Conservation: `cash + reserve + outstanding + nav_loss == lp_in - lp_out + fees_retained + fees_to_reserve`, and the vault's token balance equals `cash + reserve` (`get_accounting().tracked_balance`).

Build: native `cargo check` is rejected by near-sdk 5.30.1. Use `cargo check|clippy --workspace --locked --target wasm32-unknown-unknown` with the rustup stable toolchain (1.95.0, has the wasm targets; `/usr/bin` rustc 1.99.1 has none). The default wasm contains bulk-memory and sign-extension opcodes. `contracts/build-wasm.sh` produces strict MVP wasm with `RUSTC_BOOTSTRAP=1 RUSTFLAGS='-C target-cpu=mvp' cargo build -Zbuild-std=std,panic_abort`.

Gas (estimates from attached constants, not measured): `ft_transfer` 15 Tgas and callback 20 Tgas are reserved in `request_draw`, `lp_withdraw` and the pay route; the pay route plus its own execution needs about 50 Tgas of the `ft_transfer_call` budget, so clients attach 100 Tgas. `request_draw` itself: about 15 + 20 + 10 own = 45 Tgas, attach 80.

Audit findings (near-contract-audit checklist): callbacks are `#[private]`; owner checks on admin; `assert_one_yocto` on `lp_withdraw` and `ft_transfer`; distinct storage prefixes; state is written before every outgoing promise with a reverting callback; U128 on all JSON amounts; checked math; no floats in contract code. Accepted risks: (1) wash revenue, a business can route its own payments through a second account to inflate trailing revenue, bounded by the 2,000 USDC cap and the mock token; (2) the contract pays storage for auto-registered share accounts and new businesses, bounded by the 1 USDC minimum; (3) `revert_payment` uses saturating subtraction, so an LP withdrawal that drains cash between a payment and a failed business transfer could skew counters; (4) a written-off business stays defaulted; (5) `nft_tokens` and `get_notes` scan all loans (views only); (6) the reserve is outside NAV and is only released by write-offs.
