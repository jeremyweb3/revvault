# STATUS

Last updated 2026-11-08 (web app rewired to testnet). Testnet only, throwaway deployer, mock USDC, unaudited.

## Testnet deploy (done 2026-11-08)
Deployer `revvault-dep-17094.testnet` (throwaway). Full record with every tx hash: `deployments/testnet.json`.

| thing | account | explorer |
|---|---|---|
| RevVault | `revvault.revvault-dep-17094.testnet` | https://explorer.testnet.near.org/accounts/revvault.revvault-dep-17094.testnet |
| mock USDC | `usdc.revvault-dep-17094.testnet` | https://explorer.testnet.near.org/accounts/usdc.revvault-dep-17094.testnet |
| biz-agent | `biz-agent.revvault-dep-17094.testnet` | https://explorer.testnet.near.org/accounts/biz-agent.revvault-dep-17094.testnet |
| biz-creator | `biz-creator.revvault-dep-17094.testnet` | https://explorer.testnet.near.org/accounts/biz-creator.revvault-dep-17094.testnet |
| payer | `payer.revvault-dep-17094.testnet` | https://explorer.testnet.near.org/accounts/payer.revvault-dep-17094.testnet |
| vendors | `gpu-provider`, `llm-api`, `data-feed` `.revvault-dep-17094.testnet` | |

Key txs:
- usdc deploy https://explorer.testnet.near.org/transactions/8tjhuRSGgeu7ZPo8gwdG4zAhWyibHoYADkKr1137C3gc, `new` .../8irF9TfpS9NW6zGy3vRvRhT6nAnesEeZdhd8PEnUaa7q
- revvault deploy https://explorer.testnet.near.org/transactions/FHy9jpBmCPsWx9m1zXRVW1kpXtPqcGnAHGJuMzYGVEKY, `new` .../8E3qgfqLF7J9goF5Q9iywcyx83TCiZqRfLUYLpqe9qiQ
- LP deposit (10,000 mock USDC) https://explorer.testnet.near.org/transactions/9DqPNvncVHNpo8P7azfVPFzYituKwp3qc4bg3T4ZUrXE
- agent draw `ln_001` https://explorer.testnet.near.org/transactions/C3eSDwguwiJnHMF9zyupwaEATaKnhpVeRVRZQ358pgpt
- agent repay payment (note settled) https://explorer.testnet.near.org/transactions/DBUCiZ67xSRfqnTiVx5FdHqpryZsack6K5Raz18CGhEx
- creator draw `ln_002` (left open) https://explorer.testnet.near.org/transactions/Ek3bQ6LhEYzY46FhkmMuVY88oRUfg9ULx8o2mfDzeeit

VM acceptance: both wasm files (strict MVP build, names stripped) were accepted by the testnet VM, `new` ran on both, and the whole loop below executed.

## Seeded loop (live)
LP 10,000 USDC -> 3 x 800 USDC routed to biz-agent, 3 x 400 to biz-creator -> agent draw 500 USDC (`ln_001`, fee 15, vendor gpu-provider paid) -> repay share raised to 90% -> one 800 payment repaid 515 -> `ln_001` settled, loan closed. Creator draw 200 USDC (`ln_002`, open, vendor data-feed paid). Vault: tvl 10,007.5, reserve 7.5, 1 open loan.
On-chain revenue is seeded demo revenue landing on one day, not live history.

## Budget
Storage is 1 NEAR per 100 KB. Wasm is stripped (`wasm-tools strip --all`, in `contracts/build-wasm.sh`): revvault 434,499 B, mock_usdc 184,202 B. Sub-accounts funded: usdc 2.4, vault 5, biz 0.2 each (+0.15 top-up), payer 0.5, vendors 0.05 each. Deployer balance after seed about 3.18 NEAR.

## Run
`node scripts/deploy.ts --dry-run|--live --deployer=<id>.testnet`, `node scripts/seed.ts --dry-run|--live --deployer=<id>.testnet`. Live needs `~/.config/revvault/deployer.json` (never printed or copied). Idempotent: existing accounts and code are skipped, nothing is deleted. RPC `https://test.rpc.fastnear.com` (rpc.testnet.near.org returns 429 deprecated).

## Checks
No test suites (owner decision 2026-11-08). `tsc --noEmit` in `scripts/` is clean; eslint is not installed in `scripts/`; Rust untouched (no clippy run needed).

## Web app (testnet-only, 2026-11-08)
No mock mode, no mode switch, no `?mode=`, no localStorage engine. `web/` reads vault stats, notes, loans, credit/limit (`get_credit`), 30-day ledger, LP position, params, USDC and rvUSDC from the deployed contracts via JSON-RPC (`https://test.rpc.fastnear.com`). Loading, empty, per-card error and RPC-down (Retry only) states. Wallet via `@hot-labs/near-connect` 0.12.0 (testnet wallets only; `.near` accounts refused). Built write paths: mint test USDC (open faucet, 10,000 max/call), NEP-145 USDC registration, LP deposit (`ft_transfer_call`, 1 yocto, 150 Tgas), LP withdraw (1 yocto), pay link (`ft_transfer_call` to the router), draw (`request_draw`), poke (permissionless), register business. Each waits for the final tx status over RPC, refreshes state and shows an explorer link. Removed: +75 days, simulate payment, Reset demo, demo business switcher. `web/src/lib/deployment.json` and `intents-preview.json` are copies so `web/` builds on its own.
Not exercised: every write above (needs a throwaway testnet wallet to sign). Checks: `npm run typecheck|lint|build` in `web/`.
