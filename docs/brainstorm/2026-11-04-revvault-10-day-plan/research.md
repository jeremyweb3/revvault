# RevVault 10-day plan: research

Back to the plan: [../2026-11-04-revvault-10-day-plan.md](../2026-11-04-revvault-10-day-plan.md)

All pages were read on **2026-11-04** through WebFetch/WebSearch, whose page summaries come from a small model. No raw page was read directly, so exact wording and numbers are **not independently confirmed**; treat "high" as "the summary was specific and consistent with a second source", not "verified by eye". Anything not listed here is unverified.

## Questions
1. Which near-sdk, build tool and test harness should the contract use today?
2. How does the NEP-141 receiver path behave, and how should outgoing transfers and rollback be done?
3. Can the contract pay a vendor through NEAR Intents, and is there a testnet?
4. What do browser wallet and RPC access look like in 2026?
5. Which access-key model fits an autonomous agent?
6. How should the pitch word the competitive position? (see R-C rows, filled from the competitor check)

## Findings

### Contract stack
| # | Claim | Source | Read on | Confidence |
|---|---|---|---|---|
| R1 | near-sdk stable is 5.30.0 (released 2026-10-27, rust_version 1.95). | https://crates.io/api/v1/crates/near-sdk | 2026-11-04 | high |
| R2 | 5.30.0 changelog lists NEP-655 state-init/UAID validation, `extern "C-unwind"` for near-sys, BLS host functions returning `None` on error, unit-test mock on nearcore host functions; targets nearcore 2.14. cargo-near is not mentioned. | https://raw.githubusercontent.com/near/near-sdk-rs/master/CHANGELOG.md | 2026-11-04 | med-high |
| R3 | Documented build: `cargo near build non-reproducible-wasm` -> `target/near/<name>.wasm`; needs rustup, `wasm32-unknown-unknown`, cargo-near. `cargo near new` scaffolds. Quickstart verified there with rustc 1.86 / cargo-near 0.16.1 / near-cli-rs 0.22, which look stale next to MSRV 1.95. | https://docs.near.org/smart-contracts/quickstart | 2026-11-04 | high (path), low (versions) |
| R4 | `ft_on_transfer(sender_id, amount, msg)` returns the **unused** amount (U128 string). | https://github.com/near/NEPs/blob/master/neps/nep-0141.md | 2026-11-04 | high |
| R5 | `ft_transfer` and `ft_transfer_call` need exactly 1 yoctoNEAR (`assert_one_yocto`). | NEP-141 and near-contract-standards `core_impl.rs` (https://github.com/near/near-sdk-rs/blob/master/near-contract-standards/src/fungible_token/core_impl.rs) | 2026-11-04 | high |
| R6 | The token's `ft_resolve_transfer` refunds the sender if the receiver call fails, treats an unparseable result as "all unused", and caps refunds at the receiver's current balance. | NEP-141, `core_impl.rs` | 2026-11-04 | high |
| R7 | Outgoing call pattern: `#[ext_contract]`, `.ft_transfer(..).then(Self::ext(current_account_id()).cb())`; callback is `#[private]` with `#[callback_result] Result<_, PromiseError>`; reserve gas for the callback; **state is not rolled back automatically**, revert manually. | https://docs.near.org/smart-contracts/anatomy/crosscontract | 2026-11-04 | high |
| R8 | near-workspaces is 0.24.0 (2026-10-26). `cargo test` runs sandbox tests. | https://crates.io/api/v1/crates/near-workspaces ; quickstart | 2026-11-04 | high |
| R9 | Sandbox binary resolution: `NEAR_SANDBOX_BIN_PATH`, then cache `~/.near/near-sandbox-<ver>/`, then download. First run needs network unless the cache is warmed. | https://docs.rs/near-sandbox-utils/latest/src/near_sandbox_utils/lib.rs.html | 2026-11-04 | med (search snippet, may be older code) |
| R10 | Gas for the `ft_transfer_call` chain: only the 5 TGas resolve reserve is confirmed. A commonly used 30 TGas total is **not verified**. The Intents docs example for `ft_transfer_call` uses 100 TGas. | `core_impl.rs`; Intents deposits doc (R15) | 2026-11-04 | med |
| R11 | Local toolchain on the dev laptop: rustc 1.99.1, targets `wasm32-unknown-unknown` and `wasm32v1-none` installed, `cargo-near` and `near` CLI **not installed**, node 26, pnpm present. | `rustc --version`, `rustup target list`, `ls ~/.cargo/bin` on 2026-11-04 | 2026-11-04 | high |

### Wallet, RPC, keys
| # | Claim | Source | Read on | Confidence |
|---|---|---|---|---|
| R12 | The docs wallet-login page presents `@hot-labs/near-connect` (`new NearConnector({network:"testnet"})`, `connector.connect()`, `wallet.signAndSendTransaction`). It has no built-in view calls; use near-api-js `JsonRpcProvider` + `callFunction`. Whether it formally replaces wallet-selector was not confirmed. | https://docs.near.org/web3-apps/tutorials/wallet-login | 2026-11-04 | med |
| R13 | Public testnet RPCs listed: FASTNEAR `https://test.rpc.fastnear.com`, dRPC `https://near-testnet.drpc.org`, Intear `https://testnet-rpc.intea.rs`. The free near.org/pagoda RPCs have a phased deprecation announced from 2025-06-01. | https://docs.near.org/api/rpc/providers.md ; https://near.org/blog/deprecation-of-near-org-and-pagoda-co-rpc-endpoints | 2026-11-04 | high (table), med (blog via snippet) |
| R14 | A function-call key is bound to one `receiver_id`, optional `method_names`, **can never attach a deposit**, and its allowance only caps gas. Only a full-access key can add keys. `AddKey` allowance 0 makes calls fail with `NotEnoughAllowance`; omitted allowance means unlimited gas budget. | https://docs.near.org/protocol/access-keys | 2026-11-04 | high |

Consequence of R5 + R14: a function-call key **cannot** call `ft_transfer_call` (needs 1 yocto). The agent's `request_draw` is deposit-free, so it can use a restricted key; the simulated customer and the LP seeder cannot, so they use throwaway full-access testnet accounts.

### Competitors and prior art (for pitch wording)
| # | Claim | Source | Read on | Confidence |
|---|---|---|---|---|
| R-C1 | bond.credit: "credit intelligence for autonomous agents"; rates agents, USDC depositors earn from rated agents; Agentic Vault is private beta / "Coming soon". Ratings tagged Arbitrum, Base, Ethereum, Polygon, XDC, Stellar. **NEAR was not found on the site today.** | https://bond.credit | 2026-11-04 | high (content), med (live status) |
| R-C2 | bond.credit score is five-factor (performance 30, risk 25, stability 20, sentiment 15, provenance 10), computed server-side from settled onchain activity: reputation based, no revenue metric. | https://bond.credit/ratings.html | 2026-11-04 | high |
| R-C3 | bond.credit GitHub org: seven repos, mostly Arbitrum-hackathon forks, a Base USDC subgraph, a risk-monitor engine; no NEAR. | https://github.com/bond-dot-credit | 2026-11-04 | high |
| R-C4 | attn.markets docs: "Current public proof is narrow"; borrower proof is Pump.fun creator fees plus approved agent service/job usage; repayment, audit and mainnet status not stated. Aggregators (not primary): Solana, non-custodial, credit lines on revenue history, automatic repayment from an agreed share of revenue, LP priority pool, no public audit. | https://docs.attn.markets ; https://solanacompass.com/projects/attnmarkets | 2026-11-04 | med-high (docs), med-low (aggregators) |
| R-C5 | Yumi Finance: "software lab building credit products on stablecoin rails"; aggregators list Pay-in-4 and B2B Net-30. Chain is contested (Circle lists Avalanche, Base, Ethereum), so "Solana BNPL" is not safe to say. | https://yumi.finance ; https://partners.circle.com/partner/yumi-finance | 2026-11-04 | low-med |
| R-C6 | Hobba: aggregator profiles describe collateral-yield self-repaying loans (Alchemix style), not revenue-repaid. Own site not reachable. | https://solanacompass.com/projects/hobba | 2026-11-04 | low-med |
| R-C7 | Clipstake: **not found** as a credit or BNPL project (only a Hedera idea page and a thin token listing). Do not cite. | search | 2026-11-04 | not verified |
| R-C8 | Vibe Lending (ZcashxNEAR hackathon, Mar 2025): idea page only (Intents, AI scoring, ZK privacy), no evidence of a live product. | https://taikai.network/hackbox/hackathons/zcashxnear/projects/cm8vagbsz02hmjoi4ajchikw9/idea | 2026-11-04 | med |
| R-C9 | No NEAR-native revenue-based financing, agent credit line, Intents lending, or past NEAR-hackathon lending winner was found. | WebSearch | 2026-11-04 | low (absence of evidence) |
| R-C10 | Ping subscriptions on NEAR exist (limits: 12 payments, 60 s interval); Shade Agents are a TEE agent framework. No source links them as one product; Roke.to could not be found at all. | https://docs.near.org/ai/shade-agents/reference/api ; Ping docs via snippet | 2026-11-04 | med / not verified |
| R-C11 | Huma (PayFi receivables) and Centrifuge (receivables pools) are the structural cousins; Maple and Goldfinch are pooled under-collateralised credit. Goldfinch/Credix status claims came from low-quality trackers: do not cite. | https://zelcore.io/academy/defi/rwa-private-credit-centrifuge-maple-goldfinch | 2026-11-04 | low |

### NEAR Intents (1Click)
| # | Claim | Source | Read on | Confidence |
|---|---|---|---|---|
| R15 | Verifier deposits: `ft_transfer_call` to `intents.near` with `msg` empty, an account id, or a DepositMessage JSON; docs example uses 1 yocto and 100 TGas. | https://docs.near-intents.org/integration/verifier-contract/deposits-and-withdrawals/deposits.md | 2026-11-04 | high |
| R16 | 1Click endpoints: `POST https://1click.chaindefuser.com/v0/quote`, optional `POST /v0/deposit/submit`, a status call by deposit address. Quote/submit/status are JWT-protected (SDK README: missing or invalid JWT -> 401). | https://docs.near-intents.org/api-reference/oneclick/request-a-swap-quote.md ; https://github.com/defuse-protocol/one-click-sdk-typescript | 2026-11-04 | high (quote/submit), med (status path not fetched) |
| R17 | JWT comes from the Partner Dashboard (https://partners.near-intents.org/home), sent as `X-API-Key` or `Authorization: Bearer`. Whether it is self-serve or approval-gated, and the lead time, are **not confirmed** (the quickstart mentions an invite-only message). | https://docs.near-intents.org/integration/distribution-channels/1click-api/authentication.md | 2026-11-04 | high (source), unknown (lead time) |
| R18 | **There is no testnet for NEAR Intents** ("use small amounts for test swaps"). `dry: true` returns a quote without `depositAddress` and starts no swap. | https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart ; request-a-swap-quote.md | 2026-11-04 | high |
| R19 | Without a key, 1Click adds 25 bps to every quote (docs disagree: another page said 0.1%, a snippet said 0.2%). With a key and no `appFees` about 20 bps, 1 bp for same-asset/stable pairs. `appFees` capped at 500 bps total. | fee-config.md, authentication.md, quickstart | 2026-11-04 | med |
| R20 | `ORIGIN_CHAIN` deposits mean sending tokens to `quote.depositAddress`; statuses `PENDING_DEPOSIT, KNOWN_DEPOSIT_TX, PROCESSING, SUCCESS, INCOMPLETE_DEPOSIT, REFUNDED, FAILED`; under-deposit on `EXACT_INPUT` is refunded by the deadline to `refundTo`. | making-a-request.md | 2026-11-04 | high |
| R21 | Official SDK `@defuse-protocol/one-click-sdk-typescript` v0.1.26 (`OneClickService.getQuote/submitDepositTx/getExecutionStatus`, `OpenAPI.BASE`, `OpenAPI.TOKEN`). | https://registry.npmjs.org/@defuse-protocol/one-click-sdk-typescript/latest | 2026-11-04 | high (version), publish date not checked |

## How it applies here
- **R1-R3, R11 -> toolchain gate (Day 1):** install cargo-near and near-cli-rs, build a hello contract with `cargo near build non-reproducible-wasm` on rustc 1.99. If that fails, fall back to the plain wasm target. This is gate G0 in the plan. Backs the single-contract decision (less to learn).
- **R4-R7 -> single contract:** with two contracts, every payment needs `ft_transfer_call` router -> vault, a second `ft_on_transfer`, and two rollback paths. With one contract the repay leg is a local state change and only the business leg is an outgoing transfer. Backs decision D1.
- **R6 -> pay path:** the FT already refunds the payer when `ft_on_transfer` returns the amount or panics, so unknown-business payments need no custom refund code.
- **R9 -> README:** `cargo test` needs the sandbox binary. README must say first run downloads it, and the plan has the agent warm the cache and document `NEAR_SANDBOX_BIN_PATH`. The screener may run offline.
- **R5, R14 -> demo accounts:** agent uses a function-call key (`request_draw` only), customer and LP demo accounts use throwaway full-access testnet keys. Backs D6 and the Track 06 tie-in.
- **R12, R13 -> UI:** views via `JsonRpcProvider` on `test.rpc.fastnear.com` with `near-testnet.drpc.org` as fallback; wallet connect via near-connect is a stretch, not on the critical path.
- **R16-R19 -> Intents decision (D5):** there is no testnet, so a testnet contract cannot truthfully claim Intents settlement. Intents becomes a **separate mainnet proof** (settler script, ~$2, evidence saved), plus a dry quote that always works. The prototype's vendor note "USDC on Base via Intents" (`prototype/index.html:300-304`) must change to a vendor flag, with the Intents label shown only for a vendor that really has a proof.

- **R-C1-R-C3 -> pitch wording:** `docs/research/01-competitive-landscape.md` records bond.credit as "lists NEAR" (V). Today's read of the site, ratings page and GitHub did not reproduce that. The plan therefore does not assert "bond.credit is on NEAR" or "nobody is on NEAR"; it says "to our knowledge, as of 2026-11-04, we found no NEAR-native revenue-routed credit line" and explains the structural difference (revenue-routed repayment, not reputation score).
- **R-C4 -> never say "first revenue-routed credit":** attn.markets is a revenue-repaid credit line on another chain. RevVault's honest claim is the combination on NEAR plus the agent-constraints framing.

## Disagreements in the sources
- bond.credit and NEAR: the earlier session's note says it lists NEAR; the 2026-11-04 read found none. Unresolved. Candra should re-check bond.credit by eye before any public sentence about it (open question Q6 in the plan).
- 1Click no-key fee: 25 bps (quickstart/authentication), 0.1% (older overview), 0.2% (snippet). The plan does not depend on it; a ~$2 payout makes it irrelevant. Read the live `/v0/quote` response instead.
- near-sdk MSRV 1.95 versus a quickstart verified on rustc 1.86: the plan trusts crates.io (R1) and verifies by building on Day 1.

## Assumptions
- **Riskiest: the Partner Dashboard JWT arrives in time.** If not, the Intents proof is a dry-quote screenshot at best and the README says so. Mitigation: apply tonight.
- `cargo near build` works on rustc 1.99.1 (unverified; gate G0).
- The sandbox binary can be downloaded on the dev machine and cached.
- Public testnet RPC (`test.rpc.fastnear.com`) is stable for a 3-day judging window.
- Judges and the screener will prefer a one-command mock mode plus a visible real testnet path over a wallet-only demo.
- Team: Candra plus coding agents, no dedicated Rust author (not confirmed; Q1 in the plan).
