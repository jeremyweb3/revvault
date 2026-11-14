# RevVault contract interface

Source of truth: `docs/handoffs/contracts.md` section 0, then this file as built. Testnet only, unaudited, mock USDC. Amounts are decimal strings of the smallest unit (6 decimals). `*_ms` fields are milliseconds as numbers; the contract uses nanoseconds internally. Rates are bps.

Honesty: only revenue routed through the RevVault pay link (`ft_transfer_call` with `action: pay`) counts as collateral. Revenue notes are economic claims recorded in the contract, pool-held, not transferable, not securities. Repayment is economic, not legal. The attestation sets the advance rate only; it never adds revenue and never creates a starter limit. APY is illustrative. There is no testnet NEAR Intents; vendor payout is a direct FT transfer (`route: "direct-ft"`).

## Contracts
- `mock-usdc`: NEP-141 + NEP-145 (`storage_deposit`, `storage_withdraw`, `storage_unregister`, `storage_balance_bounds`, `storage_balance_of`), `ft_metadata` (USDC, 6), `ft_transfer`, `ft_transfer_call`, `ft_total_supply`, `ft_balance_of`, `ft_resolve_transfer` (private), `new()`, `mint({account_id, amount})` (open, at most 10,000 USDC = `"10000000000"` per call, auto-registers the receiver).
- `revvault`: everything below. Init: `new({owner, token})`.

## Receiver
`ft_on_transfer({sender_id, amount, msg}) -> U128` (unused amount). Panics unless predecessor equals `token`. `msg` JSON, anything else or unparseable returns the full amount:
- `{"action":"lp_deposit"}`: mints rvUSDC at NAV (first deposit 1:1). Refunds if amount below `min_amount` (1 USDC).
- `{"action":"pay","biz":"<id>","ref":"<=64 chars>"}`: routes revenue. Refunds if amount is 0, ref too long, payer is the business, biz is the vault or the token, or the biz is unregistered and amount below `min_amount`. A first payment to an unregistered biz registers it as `agent`. Full amount enters the 30-day bucket; the repay slice is `ceil(amount x effective_split / 10000)` capped at debt left; state is written before the outgoing `ft_transfer` to the business; if that fails `on_business_paid` reverts and returns the full amount so the token refunds the payer. When the whole amount is repaid (`to_business == 0`) it returns 0 and no transfer is made.
- Payer must call `ft_transfer_call` on the token with 1 yoctoNEAR and at least 100 Tgas. Function-call keys cannot do this.

## Business (caller is the business account or its function-call key, 0 deposit)
- `register_business({kind: "agent"|"creator"})`: idempotent; kind is immutable after first registration.
- `request_draw({amount, vendor, memo}) -> Promise<String|null>` (loan id `ln_001`, null if the vendor transfer failed). Requires registered, not paused, not defaulted, no open loan, amount > 0, amount <= limit (`min(routed_trailing x advance_bps, per_biz_cap)`, 0 when nothing routed), amount <= vault cash, vendor not self/vault/token, memo <= 128. Fee `ceil(amount x fee_bps / 10000)`. Mints note `ln_xxx` to the vault. Calls token `ft_transfer(vendor, amount)` then `on_vendor_paid`.
- `set_repay_share({bps})`: bounds [1000, 9000]; only an increase while a loan is open.

## LP
- `lp_withdraw({shares}) -> Promise<U128>` (1 yoctoNEAR): pays `shares x NAV / supply`; panics `"insufficient liquidity: available <amt>"` when value exceeds cash. Failure of the payout restores shares and cash.
- rvUSDC share token (NEP-141 subset, symbol `rvUSDC`, 6 decimals): `ft_balance_of`, `ft_total_supply`, `ft_metadata`, `ft_transfer` (1 yoctoNEAR; receiver auto-registered; LP cost basis moves pro rata). No `ft_transfer_call`, no `storage_deposit`. NAV = `cash + outstanding principal`; the first-loss reserve is held outside NAV.

## Notes (NEP-171 views, pool-held)
`nft_metadata` (name "RevVault revenue note", symbol "RVNOTE"), `nft_token({token_id})`, `nft_total_supply`, `nft_tokens({from_index?, limit?})`, `nft_supply_for_owner`, `nft_tokens_for_owner`. Owner is always the vault account. `nft_transfer` and `nft_transfer_call` always panic `"notes are pool-held in this MVP"`. Page limit 100.
`get_note({id}) -> Note | null`, `get_notes({account?, kind?, status?}) -> Note[]` (newest first, at most 100).
`Note = {id, business, kind, holder, principal, fee, repaid, repay_share_bps, minted_at_ms, due_at_ms, status: "open"|"settled"|"past_due"|"written_off", vendor, memo}`.

## Keeper and owner
- `poke({biz})` (anyone, idempotent): after `due_at` marks past due (split becomes `max(current, past_due_split_bps)`); after `due_at + grace` writes the loan off (reserve first, then NAV absorbs) and marks the business defaulted.
- `mark_delinquent({biz})`: owner any time, anyone after due.
- Owner only: `set_params({update})` (fields `advance_bps_agent`, `advance_bps_creator`, `per_biz_cap`, `fee_bps`, `loan_term_ns`, `grace_ns`, `repay_share_bps_default`, `past_due_split_bps`, `reserve_bps`, `min_amount`, all optional), `pause_business`, `unpause_business`, `set_business_kind({biz, kind})`, `set_attestor({attestor_pk})` (base64, 32 bytes or null).
- `post_attestation({payload, signature}) -> U32` (applied advance_bps): `payload` is the exact canonical JSON string `{"biz":"..","advance_bps":N,"valid_until_ms":N,"nonce":N}` (this key order, no whitespace), `signature` base64 ed25519 (64 bytes) over the payload bytes, verified against `attestor_pk`. Applied bps is clamped to `[base_for_kind, base_for_kind + 2000]`. Rejects expired, validity over 30 days, reused nonce, unknown biz.

## Views
`get_credit({account}) -> {limit, available, outstanding, trailing_revenue, advance_rate_bps, repay_share_bps, status: "active"|"delinquent"|"paused", no_history, kind, effective_split_bps, due_at_ms|null, past_due, attested, est_days_to_clear|null}`.
`get_loans({account}) -> Loan[]` newest first; `get_loan({id}) -> Loan|null`; `Loan = {id, business, vendor, principal, fee, repaid, opened_at_ms, due_at_ms, memo, status: "open"|"closed"|"delinquent"|"written_off"}`.
`get_ledger({account, days}) -> {day:"YYYY-MM-DD", amount}[]` oldest first (days 1..90).
`get_vault_stats() -> {tvl, cash, reserve, utilisation_bps, illustrative_apy_bps, open_loans, delinquent, total_shares}`.
`get_lp({account}) -> {shares, value, earned}`; `get_accounting()`; `get_params() -> Config`; `get_owner()`.
Defaults: advance agent 4000, creator 3000, cap 2000 USDC, starter limit 0, fee 300, term 60 days, grace 14 days, window 30 days, split 2000, past-due split 5000, reserve 5000.

## Events
NEP-297 `EVENT_JSON:{"standard":"revvault","version":"1.0.0","event":..,"data":..}`:
`payment_routed {biz, payer, amount, ref}`, `repay_applied {biz, loan_id, amount, debt_left}`, `draw_opened {biz, loan_id, amount, fee, vendor, memo}`, `vendor_paid {loan_id, vendor, amount, route:"direct-ft"}`, `vendor_failed {loan_id}`, `loan_closed {biz, loan_id}`, `loan_past_due {biz, loan_id}`, `lp_deposit {account, amount, shares}`, `lp_withdraw {account, amount, shares}`, `lp_withdraw_failed {account, amount, shares}`, `payment_reverted {biz, payer, amount, ref}`, `business_registered {biz, kind}`, `note_minted {id, biz, kind, principal, fee, holder}`, `note_settled {id}`, `note_written_off {id}`, `attestation_applied {biz, advance_bps}`.
NEP-171: `nft_mint` at draw, `nft_burn` when the vendor transfer fails. NEP-141: `ft_mint`, `ft_burn`, `ft_transfer` events for rvUSDC from near-contract-standards.

## Callbacks (private, not for clients)
`on_business_paid`, `on_vendor_paid`, `on_lp_paid`.

## Build
`contracts/build-wasm.sh` (strict MVP wasm, see `docs/tech/contracts-spec.md`). Native `cargo check` is blocked by near-sdk; use `--target wasm32-unknown-unknown`.
