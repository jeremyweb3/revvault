# Hackathon brief (source: https://nearhackathon.com, fetched 2026-11-04)

## Dates (UTC)
- Dev window 1–14 Nov 2026. Deadline 14 Nov 23:59. Judging 16–18 Nov. Results by 18 Nov 23:59.

## Prizes (paid in NEAR)
Grand $55K ×1; per-track 1st $10K, 2nd $3K, 3rd $2K across 13 tracks. A project may enter multiple tracks.

## Tracks we target
- **04 Autonomous Business** — "AI-native businesses that handle treasury, sales, procurement, cross-chain payments via NEAR Intents, and revenue sharing. Humans set only the constraints, and the company runs itself within them." Tags: AI Agents, NEAR Intents, Chain Signatures.
- **08 Real-World Money** — "Payroll, invoicing, remittances, merchant payments, and stablecoin rails for real businesses. Something a normal company could use tomorrow." Tags: Stablecoins, NEAR Intents, Meta Transactions.
- **01 Unstoppable DeFi** (stretch) — lending, vaults settling cross-chain via Intents, no custodian.
- Also adjacent: 07 Agent Economy (agents pay for compute/APIs), 06 AI Security (spending limits, function call keys).

Implication: the pitch should show an **agent business that runs itself within constraints** (credit limit + repay split = the constraints) and a **normal company flow** (invoice/pay-link -> stablecoin). Track 08 wants "usable tomorrow", so the demo must feel like a real product, not a contract console.

## Judging
- Screening: Claude Code & Codex verify the project runs and matches README.
- Final: human panel (Illia Polosukhin, Eddy Lazzarin a16z, Mert Mumtaz Helius, Avichal Garg Electric Capital, Kain Warwick Synthetix, Haseeb Qureshi Dragonfly, Stepan Gershuni cyber•Fund). DeFi-literate judges: they will probe default risk, LP loss, oracle trust. Have an honest answer ready (see 02-novelty-and-risks).
- Past criteria (guide only): technical implementation, design, impact, originality, sustainability.

## Submission checklist
1. Working prototype (code since announcement counts).
2. Public repo.
3. X demo post: says built at NEAR HACKATHON, tags @NEARProtocol, #NEARHackathon, with video/screenshots.
4. Form: name, lead, email, team size, tracks, NEAR wallet, repo link, demo post link, description 20–2000 chars.
- One submission per project; one person may enter two projects if READMEs name each other.

## What this means for scope
- Live on **testnet** with a seeded demo and a "simulate customer payment" button, plus real contract calls. Mainnet money is not needed.
- A 60–90 s video is a deliverable. The UI must be designed around the demo story (see ui/01).
