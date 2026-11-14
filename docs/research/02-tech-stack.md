# 02 — Tech stack

Track B of docs/research/00-brief.md. All sources read 2026-11-04 unless noted. Labels: V = verified against a primary source (cited), U = unverified or inferred. Source ids [S#] are listed at the end. Nothing was installed and no repo file other than this one was written.

## Summary

- Stack is settled and current: near-sdk 5.30.0 + near-contract-standards 5.30.0 (Rust 1.95 MSRV, which the machine already has), near-workspaces 0.24.0 (sandbox 2.14.0, Linux x86_64 binary reachable), cargo-near 0.22.0 (not installed locally), Next.js 16.4.5 + React 19.3.1, wallet via `@hot-labs/near-connect` 0.12.0 (the library docs.near.org and the wallet-selector README now both point to), views via plain JSON-RPC to FastNEAR testnet (CORS open).
- **1Click / NEAR Intents is mainnet only. There is no testnet and none planned** (official FAQ). The 1Click OpenAPI lists a single server, `https://1click.chaindefuser.com`, and its token list has no testnet assets. Our mock USDC on testnet cannot be paid out through Intents. The brief's "real vendor payout via 1Click" must be cut to: real on-chain `ft_transfer` of mock USDC to the vendor on testnet, plus a clearly labelled mainnet dry-quote preview. This confirms the PRD cut order ("real Intents payout, mock+log, say so").
- NEP-366 relayer: **cut.** The reference relayer (`pagoda-relayer-rs`) exists, but the relayer cannot supply attached deposits, and `ft_transfer_call` needs 1 yoctoNEAR from the user, so the payer path is not truly gasless. It also adds a server to run. Document it as future work.
- Biggest technical correction to the docs: the callback does not auto-rollback. A failed outgoing transfer leaves earlier state changes in place; the callback must revert them by hand and, on the `ft_on_transfer` path, return the unused amount so the token contract refunds the payer.
- Contract + tests are about 6 to 7 developer days if one person writes Rust; the build plan fits only if contracts start day 2 as scheduled. Effort table in Recommendations.

## Findings

### Local machine (read-only checks, 2026-11-04)
| Check | Result | Label |
|---|---|---|
| `rustc --version` / `cargo --version` | rustc 1.95.0 (2026-04-14), cargo 1.95.0. Equal to near-sdk 5.30.0 MSRV 1.95.0 [S1][S2] | V |
| rustup toolchains | stable (active, 1.95.0), 1.92, `1.89.0-sbpf-solana-v1.52` | V |
| `rustup target list --installed` | `wasm32-unknown-unknown`, `wasm32v1-none`, `x86_64-unknown-linux-gnu`. The NEAR README says `rustup target add wasm32-unknown-unknown` [S2]; already present | V |
| `cargo near --version` | `error: no such command: near`. cargo-near is NOT installed | V |
| `near --version` | not found (near-cli-rs not installed) | V |
| `node --version` | v26.12.1. Next 16 needs >=20.9.0 [S14]; near-api-js 7.4.0 declares node >=22.22.2 and pnpm >=10.4.1 [S6] | V |
| `pnpm --version` | 11.4.0 | V |
| Sandbox binary | near-sandbox 0.4.0 default version is 2.14.0 [S4]; the S3 tarball `.../nearcore/Linux-x86_64/2.14.0/near-sandbox.tar.gz` answered HTTP 200 with Content-Length 35,582,480 (35.6 MB) on a HEAD request. Not downloaded. Disk has 16 GB free. Downloads are automatic on first test run | V (URL pattern reconstructed from the S3 listing, HEAD only; the actual in-crate download path was not read: U) |
| Network | `https://test.rpc.fastnear.com` and `https://rpc.testnet.near.org` both answered `status` with chain_id testnet, protocol 88, `access-control-allow-origin: *` | V |

Consequence: `cargo install cargo-near` or the prebuilt installer is needed once. The README gives `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/latest/download/cargo-near-installer.sh | sh` [S2]. Do it only after the user approves (this task forbids installs).

### Current versions (crates.io and npm registry JSON, 2026-11-04) V [S5][S6]
Rust: near-sdk 5.30.0 (2026-10-27), near-contract-standards 5.30.0, near-workspaces 0.24.0 (2026-10-26), near-sandbox 0.4.0, near-api 0.8.7, cargo-near 0.22.0, near-primitives 0.38.0.
npm: next 16.4.5 (published 2026-11-03), react 19.3.1, `@hot-labs/near-connect` 0.12.0 (2026-10-26), `@near-wallet-selector/core` 10.1.4 (2025-12-04), near-api-js 7.4.0 (2026-10-23), `@near-js/providers` 2.5.1, `@defuse-protocol/one-click-sdk-typescript` 0.1.26.

### near-sdk and NEP-141
- near-sdk 5.30.0 changelog: protocol 88 / nearcore 2.14, MSRV bumped to 1.95; the unit-test mock is now backed by nearcore host functions (breaking for unit tests) [S1]. Testnet reports latest protocol 88, so the SDK and network match. V
- Receiver trait in near-contract-standards: `fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128>` [S3]. The return value is the amount NOT used. V
- `ft_transfer_call` in the reference FT: asserts exactly 1 yoctoNEAR, moves the tokens to the receiver first, calls the receiver's `ft_on_transfer` with all remaining gas, then chains `ft_resolve_transfer` with a fixed 5 TGas [S3]. `internal_ft_resolve_transfer` reads result 0 with `env::promise_result_checked`, treats a failed or unparsable result as "everything unused", clamps the refund to the amount and to the receiver's current balance, and moves it back to the sender [S3]. V
- Consequence: if `ft_on_transfer` returns a Promise chain, the value the final callback returns is what the FT contract reads as "unused". That is how a contract can refund the payer after an outgoing transfer fails. V for the mechanism in the reference code; U that this exact two-hop chain behaves as expected under gas limits (needs a workspaces test).
- docs.near.org FT page confirms: receiver returns the unused amount, 1 yoctoNEAR is required, `storage_deposit` registers accounts (NEP-145 "highly recommended") [S10]. The page does not state that the receiver must be registered; the reference code uses `internal_unwrap_balance_of` for balances [S3] (U on the exact panic behaviour). Plan to register the vault contract, business accounts and vendor on the mock USDC with `storage_deposit` (the reference FT example in near-sdk-rs does exactly that in its workspaces test [S3b]).
- Callbacks: docs.near.org cross-contract page says the callback is `#[private]`, takes the result via `#[callback_result]` typed `Result<T, PromiseError>`, is attached with `Self::ext(env::current_account_id())` and `with_static_gas`, and "Always reserve gas for the callback" [S11]. It states the callback runs even when the called function panics, state changes of the original call "won't revert automatically", and if the callback itself fails only its own changes revert [S11]. The near-sdk `callback-results` example shows `#[callback_result(max_bytes = ...)] b: Result<String, PromiseError>` and `#[callback_unwrap]` [S3c]. V
- NEP-297 events: near-sdk supports `#[near(event_json(standard = "..."))]` on an enum; it emits `EVENT_JSON:{...}` per NEP-297 [S3d]. V
- near-contract-standards ships an FT implementation (`FungibleToken`, events `FtMint/FtTransfer/FtBurn`) and the near-sdk repo contains `examples/fungible-token` plus `lockable-fungible-token` and `callback-results` [S3]. V. A mock USDC with 6 decimals needs only metadata `decimals: 6` and an open `mint` method (the example FT is owner-minted; an open faucet `mint` for testnet is a deliberate addition: U).

### near-workspaces and testing
- near-workspaces 0.24.0 requires Rust 1.95 (workspace `rust-version`), sandbox tests run on Linux x86 and macOS; `sandbox()` and `testnet()` workers exist; env `NEAR_SANDBOX_BIN_PATH` overrides the binary [S7]. It depends on near-sandbox 0.4.0 [S7]. V
- The near-sdk repo's own FT example (edition 2024, rust-version 1.95) uses `near-workspaces = { version = "0.24.0", features = ["unstable"] }` and builds the contract inside the test via `cargo_near_build::build_with_cli` [S3b]. That is the pattern to copy so a bare `cargo test` builds the wasm itself. V that the example does this; U whether it requires the `cargo-near` CLI binary on PATH (needs a 15-minute spike; fallback is a `make test` that runs `cargo near build non-reproducible-wasm` first, or plain `cargo build --target wasm32-unknown-unknown --release`).
- Time travel: the README documents `worker.fast_forward` for time-dependent logic [S7]. Useful for the 30-day trailing window and due dates. V
- Testnet use: `near_workspaces::testnet()` plus `dev_deploy` works on testnet [S7]. Public testnet RPC is rate-limited; keep CI on the sandbox.

### cargo-near
cargo-near 0.22.0 (crates.io 2026-10-19; GitHub release tag dated 2026-07-14, the two dates disagree, so the latest tag on GitHub may lag crates.io: U). Commands: `cargo near build` (reproducible by default via Docker; `non-reproducible-wasm` is a thin wrapper around `cargo build --target wasm32-unknown-unknown --release`), `cargo near deploy`, `cargo near create-dev-account` [S2][S8]. Use `non-reproducible-wasm` locally (no Docker), `--no-abi` is available [S2]. V

### Sub-accounts, function-call keys (open question 5)
Not independently re-verified against a docs page this session. Standard NEAR facts that I did not re-read: a contract can create sub-accounts and add access keys with promise actions; a function-call key cannot attach a deposit. The repo's contracts-spec already relies on the second (request_draw "no deposit"). U. Consequence that IS derivable from V sources: `ft_transfer_call` requires 1 yoctoNEAR [S3][S10], so a function-call access key cannot make a payment; the payer uses a wallet-signed (full access) transaction. The agent key is limited to `request_draw` and other non-deposit calls. Recommendation: shared router (single contract), as architecture.md already proposes; do not spend time on per-business sub-accounts.

### NEP-366 relayer (open question 6)
- docs: NEP-366 lets a third party cover gas; the relayer pays gas, attached deposits on inner actions come from the client's account, not the relayer; the client account must already exist; a relayer can filter by sender/receiver/method/args; reference implementation is `github.com/near/pagoda-relayer-rs`; docs do not say whether it is maintained or how long setup takes [S12][S12b]. V
- NEP-366 transactions take an extra block, contain a single delegate action [S12b]. V
- Contradiction in architecture.md: "relayer pays gas ... for payers on pay links". Evidence says the payer's 1 yoctoNEAR deposit and any NEAR storage come from the client, so a payer needs an existing funded account anyway. Docs side wins; the "gasless for payers" claim should be dropped. For the business agent's `request_draw` (no deposit) gasless is feasible but the agent already holds a function-call key and testnet NEAR is free.
- Verdict: **CUT.** Already in the PRD cut order. Mention as future work with the honesty line "Meta Transactions do not redirect revenue".

### Wallet connection (open question 7)
- docs.near.org wallet-login tutorial recommends `@hot-labs/near-connect`: install `npm install @hot-labs/near-connect near-api-js`; create a `NearConnector` with `network: "testnet"`; events `wallet:signIn` / `wallet:signOut`; `connector.connect()` opens the modal; `connector.wallet()` then `signAndSendTransaction`; no built-in view calls, use `JsonRpcProvider` with a public RPC [S9]. V
- near-connect repo: options `walletConnect`, `signIn` (`contractId`, `methods` for a limited-access key), `features` (e.g. filter wallets with `testnet`), `cspNonce`; wallets listed include HOT, Meteor, Intear, MyNearWallet, Nightly, Near Mobile, Unity, OKX, WalletConnect; no SSR/Next.js notes [S9b]. V
- wallet-selector README (v10.1.4, last published 2025-12-04) carries a banner: the NEAR Infra Committee / Foundation recommends HOT Connect; selector remains supported during a transition [S13]. V
- Next.js notes: none in the docs. Wallet code touches `window`; load the connector only in a client component (`'use client'`) and create it inside an effect or with `next/dynamic` and `ssr: false` to avoid hydration mismatch. This is inference from general Next.js rules [S14], not from near-connect docs: U.
- Which wallets work on testnet: only "a testnet feature flag" is documented [S9b]; which of the listed wallets honour it is U. Plan for MyNearWallet testnet and Meteor first; verify on day 8 or earlier, and keep a fallback.
- Recommendation: near-connect with `network: "testnet"`; `signIn` with the vault `contractId` and the non-deposit methods to get a function-call key; plus a "demo key" fallback (a throwaway testnet key pair held by the page for the `/demo-live` path) so a wallet failure never blocks the demo. `/demo` itself stays wallet-free mock mode per the PRD.

### RPC endpoints and browser view calls (part of open question 7)
- docs.near.org provider table lists testnet endpoints: FastNEAR `https://test.rpc.fastnear.com` (public, archival paid, limit not published), NEAR archival `https://archival-rpc.testnet.near.org` (severely rate limited), dRPC, Intear, ZAN. It does not mention `rpc.testnet.near.org` [S15]. V
- Probed: `test.rpc.fastnear.com`, `rpc.testnet.fastnear.com` and `rpc.testnet.near.org` all returned 200 for `status` with `access-control-allow-origin: *` (2026-11-04). V. So browser `fetch` of JSON-RPC `query/call_function` works with no key and no proxy.
- Recommendation: default `https://test.rpc.fastnear.com`, env override, plain `fetch` (no SDK) for the read adapter implementing RevVaultApi; poll views every 3 to 5 s. FastNEAR's free-tier limit is unpublished: cache and debounce. Rate-limit behaviour: U.

### NEAR Intents / 1Click (open questions 1 and 2)
- **Testnet: none.** FAQ: "There is no testnet deployment and no plans for one", recommends testing on mainnet with separate accounts [S16]. Search summary says the quickstart says the same (small amounts on mainnet) [S16b]. OpenAPI `servers:` has only `https://1click.chaindefuser.com` [S17]. `GET /v0/tokens` returned 215 tokens, no key needed, none testnet [S17]. V
- API key: JWT from the Partner Dashboard (`https://partners.near-intents.org/home`); sent as `X-API-Key` (Bearer also accepted). Unauthenticated requests incur +0.25% (25 bps) on every non-ANY_INPUT quote; authenticated use the partner fee schedule, typically 20 bps, 1 bp for stablecoin and same-asset routes [S18]. Whether issuance is instant or reviewed is not stated: U. So the key is not strictly required to quote, it only costs more. V
- Flow: `POST /v0/quote` returns a quote-specific deposit address (`dry:true` simulates and returns no `depositAddress`, no `deadline`) [S17]; you transfer the origin asset to that address; optionally `submit deposit tx hash`; poll the status endpoint; states PENDING_DEPOSIT, INCOMPLETE_DEPOSIT, PROCESSING, SUCCESS, REFUNDED, FAILED [S17]. `depositType` ORIGIN_CHAIN or INTENTS, `recipientType`, `refundType` are enums in the spec [S17]. V
- Probe: one dry-quote POST I composed (mainnet USDC to USDC, my own field values) returned HTTP 500 "Internal server error". Treated as inconclusive (probably my payload, e.g. `recipientType`). The day-1 spike must use the SDK or the OpenAPI schema examples. U
- Contract-side payment: the Verifier doc describes depositing NEP-141 into `intents.near` via `ft_transfer_call` (receiver `intents.near`, 1 yoctoNEAR, 100 TGas enough for a simple deposit, `msg` empty or an account id or a JSON DepositMessage with `execute_intents`) and says nothing about a contract doing it [S19]. A contract can call `ft_transfer_call` itself, so it is technically possible on mainnet (U, untested), but irrelevant for testnet. For 1Click with origin NEAR, the contract would `ft_transfer` the token to the quote's `depositAddress` (U, inferred from the deposit-address flow [S17]).
- Whether the supported-token list includes any token we control: no, mock USDC is ours. Even a real mainnet payout would need real USDC.

### Next.js (open question 9)
- Latest 16.4.5 (2026-11-03), React 19.3.1; Node >=20.9.0 [S6]. Upgrade guide (lastUpdated 2026-10-15) [S14]: Turbopack default for dev and build (a custom `webpack` config fails the build); `middleware` renamed `proxy` (nodejs runtime only); `params`/`searchParams`/`cookies()`/`headers()` are async only (use `await props.params`); `next lint` removed (run ESLint or Biome directly); `serverRuntimeConfig`/`publicRuntimeConfig` removed (use `NEXT_PUBLIC_` env vars); `revalidateTag` takes a cacheLife profile as second arg; PPR flag replaced by `cacheComponents` (opt-in); TypeScript >=5.1; parallel route slots need `default.js`; `next/image` defaults tightened; `data-scroll-behavior="smooth"` needed if relying on the old scroll override; `next dev` outputs to `.next/dev`. V
- The repo AGENTS.md says to read `node_modules/next/dist/docs/` first. That directory does not exist until dependencies are installed (not done here). The guide states 16.2+ keeps the AGENTS.md block updated in `next dev` [S14]. The scaffold task must read it once installed.
- Nothing here needs `cacheComponents`; keep it off. Node polyfill hazard: some wallet/near-api-js builds import node builtins; Turbopack offers `turbopack.resolveAlias` with `browser:` aliases [S14]. Prefer not importing near-api-js in server code. U whether near-connect needs any alias.
- Chart/motion libs: not evaluated; the prototype is approved visual truth and Track A covers it. Not needed for the stack.

### Indexer (open question 8)
Not researched: tied to the attested score, which is first in the cut order. U.

## Recommendations

### Recommended stack (exact versions, checked 2026-11-04)
| Layer | Choice |
|---|---|
| Rust | 1.95.0 (pin with `rust-toolchain.toml`, add `wasm32-unknown-unknown`), edition 2024 |
| Contract | near-sdk =5.30.0, near-contract-standards =5.30.0; single contract with modules (router, vault, credit); `#[near(contract_state)]`, `#[near(event_json(standard="revvault"))]` |
| Mock USDC | separate contract crate reusing near-contract-standards `FungibleToken` (6 decimals) plus open `mint` and `storage_deposit` |
| Tests | near-workspaces 0.24.0 with `unstable` (compile in test) + tokio + anyhow; sandbox 2.14.0 auto-downloaded; `near-sdk` `unit-testing` for pure math |
| Build/deploy | cargo-near 0.22.0, `cargo near build non-reproducible-wasm`, `cargo near deploy` (install once, with user approval) |
| Frontend | Next.js 16.4.5, React 19.3.1, TypeScript >=5.1, pnpm 11.4.0, Node 26.12.1 locally (>=22.22.2 for near-api-js 7) |
| Wallet | `@hot-labs/near-connect` 0.12.0, `network: "testnet"`; near-api-js 7.4.0 only if needed to build transactions |
| Reads | plain JSON-RPC `call_function` against `https://test.rpc.fastnear.com` (env-overridable) |
| Vendor payout | testnet: on-chain `ft_transfer` of mock USDC. Intents: 1Click `GET /v0/tokens` and dry quote on mainnet as a labelled preview only |

### ft_on_transfer routing sketch (prose)
One `ft_on_transfer` serves both flows; dispatch on `msg`. First line: require the predecessor equals the configured token account (otherwise any contract could fake deposits). Parse `msg` (a JSON string, kept short): `lp_deposit` mints shares at current NAV; a pay message with business id and ref routes revenue. For a payment: update state first (add to the business's daily revenue bucket, compute `repay = min(amount * repay_share_bps / 10000, debt_left)`, round in the protocol's favour, apply `repay` to debt and vault cash/NAV, record `to_business = amount - repay`), emit `payment_routed` and `repay_applied`, then, if `to_business > 0`, call `ft_transfer(business, to_business)` on the token with 1 yoctoNEAR and a static gas budget, chained with a `#[private]` callback. The method returns `PromiseOrValue::Promise` from that chain; if there is nothing to send out it returns `PromiseOrValue::Value(U128(0))` (nothing unused). Unknown or malformed `msg` returns `Value(U128(amount))` (full refund) rather than panicking, so the payer is refunded. All amounts u128, `checked_*` arithmetic. Both sources agree on this contract of the return value [S3][S10]. Gas: the FT gives `ft_on_transfer` all leftover gas and keeps 5 TGas for its resolver [S3], so budget the outgoing transfer plus callback with explicit static gas and test under the default max.

### Callback and rollback sketch (prose)
Per the docs, a callback runs even if the target failed, and nothing reverts by itself [S11]. So: (1) mutate state optimistically before the outgoing promise; (2) keep enough in a pending record (the amounts moved, the loan id) for an exact undo; (3) in the `#[private]` callback take `#[callback_result] r: Result<(), PromiseError>`; on success finalise (mark loan open or payout done, emit `vendor_paid`); on error invert precisely the optimistic changes (restore cash, delete or void the loan, reverse ledger credit) and emit a failure event. For the `ft_on_transfer` path the callback also returns `U128`: on failure it returns the full `amount` so the FT's `ft_resolve_transfer` refunds the payer from our balance [S3]; on success it returns 0. For `request_draw`, which is a user call rather than a receiver call, the callback return can simply be unit and the draw is voided on error. Guard against re-entry between optimistic write and callback by marking the loan or payment `Pending` and rejecting new draws while pending. Required tests: failing vendor (unregistered account), failing business, invariants 1 and 5 from contracts-spec.

### 1Click verdict and honest fallback
- Verdict: **mainnet only; the hackathon demo on testnet cannot execute a real Intents payout.** Do not claim it does.
- Fallback to implement and to state in the README and UI: (a) contract pays the vendor on testnet with a real `ft_transfer` of mock USDC, event `vendor_paid` with `route: "direct-ft"`; (b) an off-chain `scripts/intents-preview` calls mainnet `GET /v0/tokens` and a `dry:true` quote for an equivalent real USDC amount and logs the quote (fees, ETA) labelled "Mainnet quote preview — no funds moved"; (c) UI badge distinguishes Testnet on-chain vs Mainnet preview; (d) README documents how a mainnet deployment would route: contract pays to a 1Click deposit address or deposits into `intents.near` (both marked untested).
- Optional upside only if a real USDC budget and key exist: one real mainnet 1Click swap by a script outside the contract, shown as a separate proof. Not recommended inside the 10-day window.

### Effort (developer days, one Rust-capable person; parallel roles can overlap)
| Piece | Days |
|---|---|
| Toolchain setup, cargo-near install, workspace skeleton, mock USDC FT + deploy | 0.5 |
| Single contract: state, router `ft_on_transfer`, revenue buckets, credit math | 1.5 |
| Draw, repay, loans, fee, delinquency, events | 1.5 |
| LP deposit, shares/NAV, reserve, withdraw (reject if illiquid) | 1 |
| near-workspaces tests (happy, partial, multi-draw, delinquency, LP, rounding, failing callback, invariants) | 1.5 |
| Testnet deploy, seed script, id registry | 0.5 |
| Frontend: JSON-RPC read adapter behind RevVaultApi | 1 |
| Frontend: near-connect + write transactions (draw, pay, deposit) with demo-key fallback | 1 to 1.5 |
| Demo agent script (sell service, create pay link, draw, repay loop) | 1 |
| Intents spike: tokens + dry quote on mainnet, preview script | 0.5 |
| NEP-366 relayer | 0 (cut; would be 1) |
| Attested score + indexer | 0 (cut; would be 1.5) |
| README, CI, screenshots, video, X post, form | 1.5 |

Contracts total about 6.5 days of the 10, so the contract must start day 2 and the demo agent must reuse the same helpers as the tests.

### Open questions 1 to 9
| # | Question | Status | Answer |
|---|---|---|---|
| 1 | 1Click API key and testnet | Answered (V) except key lead time | No testnet exists [S16][S17]. Key from Partner Dashboard [S18]; unauthenticated works at +25 bps. Issuance speed U. Dry quote not yet confirmed (my probe 500). |
| 2 | Pay into Intents vs `ft_transfer`; can a contract pay via `intents.near` | Partly answered | Deposit to `intents.near` is `ft_transfer_call` with 1 yocto and 100 TGas [S19]; a contract calling it is untested (U). Irrelevant on testnet; use `ft_transfer`. |
| 3 | Stablecoin on testnet | Answered | Own mock USDC from near-contract-standards FT; no faucet dependence. Intents cannot see it. |
| 4 | near-sdk version and receiver patterns | Answered (V) | 5.30.0; `ft_on_transfer -> PromiseOrValue<U128>` returns unused; `#[callback_result]`, manual rollback [S1][S3][S11]. |
| 5 | Sub-accounts from a contract, function-call keys | Not verified (U) | Use a shared router. FCAK cannot attach deposit, so only non-payment calls fit. |
| 6 | NEP-366 relayer | Answered | Cut. Deposits come from the client; pagoda-relayer-rs exists but maintenance status unstated [S12]. |
| 7 | Wallet connection | Answered (V) except per-wallet testnet support | near-connect, `network: "testnet"` [S9]; wallet-selector is in transition [S13]. |
| 8 | Indexer source | Not researched (U) | Only needed for the cut attested score. |
| 9 | Next.js version | Answered (V) | 16.4.5, breaking-change list above [S14]; `node_modules/next/dist/docs/` readable only after install. |

## Implications per role

### contracts
- Pin near-sdk and standards to 5.30.0, Rust 1.95 with edition 2024, `rust-toolchain.toml`, wasm target. Install cargo-near 0.22.0 after approval.
- Single contract, shared router; `ft_on_transfer` must check `predecessor == token`; unknown msg returns the full amount.
- Implement optimistic update + manual rollback callback exactly as sketched; return `U128` unused from the pay callback; guard with Pending states.
- Register vault, business, vendor on the mock USDC (`storage_deposit`) in seed and in tests; give the mock FT an open `mint`.
- Tests: near-workspaces 0.24.0 `unstable`; spike (15 min) whether `cargo test` alone builds the wasm without the cargo-near CLI on PATH; otherwise `make test` wrapper plus README line. Use `fast_forward` for time.
- Events via `#[near(event_json(...))]`; names from contracts-spec.
- No Intents code in the contract for the demo; vendor payout is `ft_transfer`.

### frontend
- Next.js 16.4.5 conventions: async `params`, `proxy.ts` not middleware, Turbopack default, no `next lint`, `NEXT_PUBLIC_` env only. Read `node_modules/next/dist/docs/` after install.
- Read adapter = plain `fetch` JSON-RPC to FastNEAR testnet (CORS open, no key); poll, cache, debounce.
- Wallet: `@hot-labs/near-connect` in a client-only component; `network: "testnet"`; pass `signIn.contractId` and non-deposit methods; add a demo-key fallback; verify which wallets work on testnet early (day 6 to 8 per build plan).
- UI must label Mock / Testnet / Mainnet-preview (honesty constraint 6). `/demo` stays wallet-free.
- Do not import near-api-js in server components; watch for node-builtin warnings (alias via `turbopack.resolveAlias` if needed).

### demo-agent+intents
- Demo agent: Node/TS script using near-api-js 7.4.0 (Node >=22.22.2 satisfied) with the function-call key for `request_draw`, and an account for paying the pay link; must run against testnet and against the same seed script.
- Intents: day-1 spike = `GET /v0/tokens` (works, no key) and one valid `dry:true` quote built from the OpenAPI or the TypeScript SDK (`@defuse-protocol/one-click-sdk-typescript` 0.1.26); get a Partner Dashboard JWT if instant, else run unauthenticated (+0.25%). Log the preview; never claim funds moved.
- Anything real on Intents costs real mainnet funds and a mainnet account; out of scope unless Candra approves a budget.

### submission
- README must state: Intents has no testnet, so vendor payout on testnet is a direct on-chain FT transfer and Intents is a labelled mainnet quote preview; relayer not built; APY illustrative; repayment economic; only routed revenue collateral.
- One-command setup must cover: Rust 1.95 + wasm target, cargo-near, Node 22.22.2+, pnpm 10.4+; `cargo test` downloads a 35.6 MB sandbox on first run (needs network; mention `NEAR_SANDBOX_BIN_PATH` for offline) [S7].
- Fix wording in architecture.md and PRD before the README copies them: remove "relayer pays gas for payers" and "pays vendor via NEAR Intents" as current features.
- Record testnet contract ids, tx hashes of one full demo loop, and the mainnet quote log as evidence for the screener.

## Assumptions and open questions

Assumptions (uncited or inferred; U):
1. Sub-account creation by a contract and function-call key limits (no deposit) behave as standard NEAR; not re-read from docs this session.
2. `ft_on_transfer` returning a Promise whose final callback value is the unused amount works end to end with the reference FT; derived from reading the reference code, to be proven by a workspaces test.
3. `cargo_near_build::build_with_cli` compile-in-test works without a pre-installed cargo-near binary; unknown.
4. near-connect works in a Next.js 16 client component with `ssr:false` and any testnet wallet; no doc says so.
5. Which wallets honour near-connect's testnet flag; unknown.
6. FastNEAR free-tier rate limits are unpublished; assumed adequate for a demo with caching.
7. 1Click key issuance speed, and the cause of my dry-quote 500, unknown.
8. The in-crate sandbox download URL equals the S3 URL I HEAD-checked; only the URL pattern and size were verified, no download performed.
9. Day estimates assume one experienced Rust developer; team size is still undecided in open-questions.md.
10. Open questions 5 and 8 remain unresolved; neither blocks the cut-down scope.
11. Contradiction notes: architecture.md says the relayer sponsors payers (docs say the deposit comes from the client; docs win). Open-questions 4 says "no source found for near-sdk 5 specifics"; resolved above, the current SDK is 5.30.0 with the patterns cited. crates.io (cargo-near 2026-10-19) and the GitHub release tag (2026-07-14) differ on date; installing "latest" from the release installer may give 0.22.0 or older, check `cargo near --version` after install.

## Sources
Read 2026-11-04.
- [S1] near-sdk-rs CHANGELOG: https://raw.githubusercontent.com/near/near-sdk-rs/master/CHANGELOG.md
- [S2] near-sdk-rs README (MSRV 1.95.0, wasm target, cargo-near commands and installer): https://raw.githubusercontent.com/near/near-sdk-rs/master/README.md ; cargo-near README: https://raw.githubusercontent.com/near/cargo-near/main/README.md
- [S3] near-contract-standards FT source: https://raw.githubusercontent.com/near/near-sdk-rs/master/near-contract-standards/src/fungible_token/receiver.rs , .../core_impl.rs , .../core.rs , .../events.rs
- [S3b] https://raw.githubusercontent.com/near/near-sdk-rs/master/examples/fungible-token/Cargo.toml and .../tests/workspaces.rs
- [S3c] https://raw.githubusercontent.com/near/near-sdk-rs/master/examples/callback-results/src/lib.rs
- [S3d] https://raw.githubusercontent.com/near/near-sdk-rs/master/near-sdk/src/lib.rs (event_json docs, lines ~1053-1110)
- [S4] near-sandbox-rs: https://raw.githubusercontent.com/near/near-sandbox-rs/main/README.md , .../src/lib.rs (DEFAULT_NEAR_SANDBOX_VERSION "2.14.0") , .../Cargo.toml
- [S5] crates.io API: https://crates.io/api/v1/crates/near-sdk (also near-contract-standards, near-workspaces, near-sandbox, near-api, cargo-near, near-primitives)
- [S6] npm registry: https://registry.npmjs.org/next/latest , /react/latest , /near-api-js/latest , /@hot-labs/near-connect/latest , /@near-wallet-selector/core/latest , /@defuse-protocol/one-click-sdk-typescript/latest
- [S7] near-workspaces-rs: https://raw.githubusercontent.com/near/near-workspaces-rs/main/README.md , .../workspaces/Cargo.toml , https://api.github.com/repos/near/near-workspaces-rs/releases/latest
- [S8] https://api.github.com/repos/near/cargo-near/releases/latest
- [S9] https://docs.near.org/web3-apps/tutorials/wallet-login
- [S9b] https://github.com/azbang/near-connect
- [S10] https://docs.near.org/primitives/ft
- [S11] https://docs.near.org/smart-contracts/anatomy/crosscontract
- [S12] https://docs.near.org/web3-apps/tutorials/meta-transactions
- [S12b] https://docs.near.org/chain-abstraction/meta-transactions , https://github.com/near/NEPs/blob/master/neps/nep-0366.md (via search summary)
- [S13] https://raw.githubusercontent.com/near/wallet-selector/main/README.md
- [S14] https://nextjs.org/docs/app/guides/upgrading/version-16
- [S15] https://docs.near.org/api/rpc/providers ; direct probes of https://test.rpc.fastnear.com , https://rpc.testnet.near.org , https://rpc.testnet.fastnear.com
- [S16] https://docs.near-intents.org/resources/faqs.md ; [S16b] https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/introduction (via search summary)
- [S17] 1Click OpenAPI: https://1click.chaindefuser.com/docs/v0/openapi.yaml ; https://1click.chaindefuser.com/v0/tokens ; index https://docs.near-intents.org/llms.txt
- [S18] https://docs.near-intents.org/integration/distribution-channels/1click-api/authentication.md
- [S19] https://docs.near-intents.org/integration/verifier-contract/deposits-and-withdrawals/deposits.md
- Local: repo docs/research/00-brief.md:16-17, docs/PRD.md:17-29, docs/tech/architecture.md:42-51, docs/tech/contracts-spec.md:21-27 and 45-54, docs/tech/open-questions.md:5-13, docs/03-build-plan.md:19-20; machine checks via bash on 2026-11-04.
