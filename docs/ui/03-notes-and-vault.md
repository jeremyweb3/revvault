# Notes and Vault screen (web/, hash route `#/lp`)

- Stats row: TVL, utilisation, illustrative APY (fees only, labelled "Not a promise of yield"), first-loss reserve.
- Your pool share: rvUSDC balance, value at NAV, withdrawable now (limited by vault cash), fund and withdraw.
- Risk panel: advance rates per kind, largest borrower share, past due count, reserve cover.
- `NotesTable` (rendered by `notesCard` in `web/src/app/views.ts`): one row per revenue note from `api.getNotes()`; columns Note, Business (kind chip, "you" chip), Debt, Repaid, Split, Due, Status (Open, Past due, Settled, Written off). Filter segment All, Agent, Creator.
- States: loading skeleton (`aria-busy`), error box with "Try again", empty ("No notes yet", "No notes for this filter").
- Kind chip: blue for Agent, cyan for Creator, shown next to the business id and in Business constraints.
- Copy: notes are pool-held economic claims recorded in the contract, not securities, not transferable in this MVP.
- Mode badge in the top bar reads Mock or Testnet and is visible at 390 px. If testnet is requested but no live adapter exists, a banner says the session is Mock.
- Mainnet quote preview (Demo control only): rendered from `deployments/intents-preview.json` inside a block titled "Mainnet quote preview, no funds moved".
