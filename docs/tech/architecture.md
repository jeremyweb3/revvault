> Draft. `docs/handoffs/contracts.md` section 0 and the 2026-11-08 plan override: lockbox is a ledger account in the router, not a sub-account; notes and rvUSDC live in the same contract; underwriting is a pure crate plus off-chain CLI.

# Architecture (proposal, research phase)

## Actors
- **Business** (agent business, e.g. `biz-agent.near` / testnet equivalent): borrower, receives customer payments.
- **Customer / payer**: pays a RevVault Pay Link (human or agent).
- **LP**: deposits stablecoin into the Vault to fund draws and earn yield from fees.
- **Vendor**: compute/API provider paid directly by the protocol.
- **Scorer (optional)**: off-chain service that signs a history-based score.

## Contracts (Rust, near-sdk)
1. `vault` — LP deposits/shares, liquidity accounting, loan book, reserve.
2. `router` — Pay Link endpoint. Receives FT payment (`ft_on_transfer`), splits repay/business, updates revenue ledger. One router per business as a **named sub-account** (`pay.biz-agent.near`) or one shared router with per-business ledger. Shared router is simpler for 10 days.
3. (merge 1+2 into a single contract for MVP if time is tight; keep module boundaries in code.)

## Money flow
```
Customer --FT pay--> Router
   Router: repay_share% -> Vault (reduces business debt)
           rest        -> Business account
   Router: records revenue in ledger (feeds credit limit)

Business requests draw (amount, vendor, memo)
   Vault checks: amount <= available_limit, pool liquidity, not delinquent
   Vault pays Vendor directly (NEAR Intents 1Click or ft_transfer)
   Loan opened: principal, fee, repay_share, due window

LP --FT deposit--> Vault ; yield = fees accrued ; withdraw subject to liquidity
```

## Credit limit (MVP formula, tune later)
`limit = min( advance_rate * trailing_30d_routed_revenue , per_business_cap ) - outstanding_principal`
- advance_rate default 0.4; starter limit for brand-new businesses (small fixed amount, flagged "no history").
- Optional attested boost: signed `{account, score, valid_until}` raises advance_rate up to 0.6.

## Repay mechanics
- Every routed payment: `repay = min(payment * repay_share, outstanding)`; remainder to business.
- Fee model: flat fee on principal at draw (e.g. 3%) rather than APR accrual: simpler, fewer rounding bugs, easy to show in UI ("repay 1,030 for 1,000").
- Auto-pause: if `now > due` and outstanding > 0 -> delinquent, limit = 0, repay_share bumped.

## Why this fits NEAR primitives
- **NEAR Intents** — vendor payout / cross-chain settlement (1Click API: tokens -> quote -> deposit -> status; needs API key).
- **Sub-accounts** — per-business router/lockbox identity (`pay.<biz>.near`).
- **Meta transactions (NEP-366)** — gasless UX: relayer pays gas for the business agent's draw request and for payers on pay links. This is a UX feature, **not** the interception mechanism.
- **Function-call keys** — give the agent a key limited to `request_draw` / `repay` with no deposit. Nice Track 06 tie-in.
- **Chain Signatures** — out of MVP scope.

## Off-chain pieces
- **Next.js app** (UI) reading contract views via RPC; mock adapter first (see ui/02).
- **Indexer script** (optional): reads FT transfers to business account via NEAR Lake / FastNEAR / NearBlocks, computes score, signs.
- **Demo agent**: small script/service that is the "autonomous business": sells a micro-service, creates pay links, requests draws to buy compute, so the demo shows the loop with no human.
- **Relayer** (for gasless): small Rust/Node server using NEP-366; can be skipped (users pay own gas on testnet) if time is short.

## Network / assets
- Testnet. Stablecoin: a test FT (own mock USDC `usdc.<ours>.testnet`) to avoid faucet dependence. Document how it maps to USDC on mainnet.

## Security notes for the README
- Reentrancy/promise ordering on `ft_on_transfer` -> split transfers: use callbacks, state updated before outgoing transfers, with rollback on failure.
- Integer math in u128, round repay in protocol's favour, test dust amounts.
- Admin keys: one `owner` for parameters, documented; no upgrade key in the demo deployment (or clearly documented).
