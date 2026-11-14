# AGENTS.md: start here (for AI reviewers and coding agents)

**RevVault** is revenue-routed credit for AI businesses on NEAR testnet. A customer pays through a RevVault pay link; the contract splits that payment in the same transaction (`ft_on_transfer`): part repays the open loan, the rest goes to the business. The credit limit is a share (40%) of the trailing 30-day revenue that actually flowed through the contract, capped at 2,000 USDC. Draws cost a flat 3% and are paid straight to a vendor account.

Hackathon: NEAR Hackathon 2026. Tracks: 04 Autonomous Business, 08 Real-World Money. Status: working testnet prototype, mock USDC, unaudited.

## Verify the claims (about 10 seconds, no wallet, no install beyond curl and python3)

```bash
bash scripts/verify-onchain.sh
```

It reads the deployed contracts (`revvault.revvault-dep-17094.testnet`) over public RPC and prints PASS/FAIL for: limit = 40% of routed revenue, a settled note with its repayments, the flat 3% fee, and a funded vault with a reserve. Transaction hashes for the seeded loop are in `deployments/testnet.json` and `STATUS.md`.

## Run the app

```bash
cd web && npm install && npm run dev      # http://localhost:5173
npm run typecheck && npm run lint && npm run build
```

Live deployment: https://jeremyweb3.github.io/revvault/ (static build of `web/`, reads the same testnet contracts). The app has no mock mode and needs no wallet to browse; signing needs a throwaway testnet account.

## Where things are

| path | what |
|---|---|
| `contracts/revvault/src/lib.rs` | the vault: `ft_on_transfer` (pay link split), `request_draw`, `lp_*`, notes, reserve |
| `contracts/mock_usdc/` | mock NEP-141 token with an open faucet |
| `web/src/lib/chain/` | JSON-RPC reads, wallet and transaction code |
| `web/src/app/` | views, guided dashboard path (`journey.ts`) |
| `scripts/` | `verify-onchain.sh`, `deploy.ts`, `seed.ts`, demo agent, Intents dry quote |
| `deployments/testnet.json` | accounts, code hashes, every tx hash |
| `docs/tech/contracts-spec.md` | contract spec and math |
| `README.md` | overview, claim-to-evidence table, honest limits |

## What is NOT claimed (read before judging)

- Testnet only. USDC is a mock token. Not audited. Repayment is economic, not legal. APY is illustrative.
- Revenue history on testnet is seeded demo data. Only revenue routed through the pay link counts as collateral.
- There is no on-chain vendor allowlist and no max-draw setting. The contract only rejects the business itself, the vault and the token as payee.
- NEAR Intents has no testnet. Testnet vendor payouts are plain token transfers. The Intents script is a mainnet quote preview that moves no funds.
- The web app's write paths (mint, deposit, pay, draw) were built but not exercised end to end here, because that needs a wallet signature. The seeded loop was executed with scripts.
- "Potentially first-of-its-kind" is a hypothesis (absence of evidence), not a proven fact. Competitors exist; see `docs/research/`.
- There are no test suites by owner decision. Checks are `cargo check`, eslint, `tsc --noEmit`, `scripts/verify-onchain.sh` and the live testnet loop.

## If you change code

Follow `CLAUDE.md` (safety rules, testnet only, no secrets, honesty constraints). Dependencies change only through `docs/handoffs/DEPS.md`.
