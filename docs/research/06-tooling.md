# 06 — Tooling (proposal)

Status: PROPOSAL ONLY. Nothing was installed, no `.claude/`, `.mcp.json` or `~/.claude` file was written. All dates read: 2026-11-04.
Scope: NEAR testnet, Rust near-sdk + near-workspaces + cargo-near, NEP-141, NEAR Intents 1Click, Next.js + TS wallet UI, Node demo-agent scripts.

Headline finding: the only vendor-maintained, established NEAR agent skills live in one repo, `near/agent-skills` (NEAR org, pushed 2026-09-28, head commit `cb32b6af`, 17 stars, skills.sh shows ~1.1K installs total). No vendor MCP server exists for NEAR contracts or for NEAR Intents (registry search for "near", "intents", "defuse" returned no vendor entry; near org and defuse-protocol org have no MCP repo). So the proposal is skills plus one docs MCP.

## Proposed

All skill commands install into the project (`.claude/skills/`), pinned by the repo head I vetted (`cb32b6af`, 2026-09-28). The `skills` CLI has no commit pin flag, so the version column records what was read; the user can re-vet if the repo moves before install.

| name | kind | source URL | version or commit | role | task | install command |
|---|---|---|---|---|---|---|
| near-smart-contracts | skill | https://github.com/near/agent-skills/tree/main/skills/near-smart-contracts | near/agent-skills `cb32b6af` (2026-09-28); SKILL.md metadata 1.0.0, MIT; targets near-sdk 5.x | contracts | Write the single near-sdk contract (router, credit draw, repay split, LP vault, own FT): `#[near(contract_state)]`, store collections with unique prefixes, `#[private]` callbacks, ft_on_transfer/reentrancy rules, storage and 1-yocto checks, `cargo near new/build/deploy` flow. See caveats A and B below | `npx skills add near/agent-skills -s near-smart-contracts -a claude-code -y` |
| near-contract-audit | skill | https://github.com/near/agent-skills/tree/main/skills/near-contract-audit | same repo `cb32b6af`; no license field in frontmatter | contracts (also submission) | Self-review of the contract before testnet deploy and before submission: callback privacy, reentrancy (state change after xcc), unsaved collection changes, owner check, yocto-attach, storage collision, float math. Fits a lending contract directly | `npx skills add near/agent-skills -s near-contract-audit -a claude-code -y` |
| near-intents | skill | https://github.com/near/agent-skills/tree/main/skills/near-intents | same repo `cb32b6af`; synced to docs.near-intents.org on 2026-09-28 (fee schedule, SDK, quote/status states) | demo-agent+intents | Vendor payout via 1Click: `/v0/tokens` -> dry quote -> wet quote -> deposit tx -> `/v0/deposit/submit` -> poll `/v0/status` to terminal state; NEAR NEP-141 deposit rule (`deposit-near.md`); TS SDK rule (`sdk.md`). See caveat C | `npx skills add near/agent-skills -s near-intents -a claude-code -y` |
| near-dapp | skill | https://github.com/near/agent-skills/tree/main/skills/near-dapp | same repo `cb32b6af` | frontend | NEAR wallet connection in the Next.js app with `@hot-labs/near-connect` + `near-connect-hooks` (`NearProvider`, `useNearWallet`: signIn, viewFunction, callFunction); keep wallet code behind the RevVaultApi adapter. Use Path B only (see caveat D) | `npx skills add near/agent-skills -s near-dapp -a claude-code -y` |
| near-api-js | skill | https://github.com/near/agent-skills/tree/main/skills/near-api-js | same repo `cb32b6af`; library near-api-js 7.4.0 (npm), repo near/near-api-js 429 stars, pushed 2026-10-26 | demo-agent+intents (also frontend views) | Node demo-agent scripts: view/call contract methods, FT `ft_transfer_call` to the router, `storage_deposit`, testnet RPC endpoints, NEP-413 signing | `npx skills add near/agent-skills -s near-api-js -a claude-code -y` |
| near-cli-rs | skill | https://github.com/near/agent-skills/tree/main/skills/near-cli-rs | same repo `cb32b6af`; CLI near/near-cli-rs 150 stars, pushed 2026-11-04 | contracts (also submission) | Generate exact non-interactive `near` commands for testnet account creation (faucet), deploy, init call, contract view/call, FT balance checks, for the README "testnet ids" section. The skill says to show each command for approval before executing | `npx skills add near/agent-skills -s near-cli-rs -a claude-code -y` |
| context7 | MCP server (optional) | https://github.com/upstash/context7 (also listed in the already-present `claude-plugins-official` marketplace, `external_plugins/context7`) | npm `@upstash/context7-mcp` 4.5.0 (modified 2026-11-03); Upstash, 64179 stars, pushed 2026-11-04 | contracts, frontend, demo-agent+intents | Live docs lookup for near-sdk 5.x, near-workspaces, near-api-js, Next.js 16 when the skills point to "consult upstream". Not NEAR-specific; skip if the NEAR skills are enough. Sends the library query text to Upstash's service | `claude mcp add --scope project context7 -- npx -y @upstash/context7-mcp@4.5.0` |

Caveats (each is a decision for the user):

- A. near-smart-contracts SKILL.md, "Prerequisites", tells the agent to run three `curl ... | sh` installers (rustup, cargo-near, near-cli-rs; all from official hosts: sh.rustup.rs and github.com/near/*/releases/latest). It is written as human setup, not as hidden behaviour, and the hosts are the vendors' own, so I kept it, but it is a fetch-and-run instruction. If you do not want that in an agent's context, reject this skill (the NEAR docs plus context7 then cover contracts) or tell the contracts agent in its handoff: "never run the Prerequisites installers; the user installs the toolchain".
- B. near-smart-contracts says "near-api-rs replaces near-workspaces-rs for tests" and its testing rule uses `near-sandbox` + `near-api`. The fixed stack is near-workspaces (near-workspaces-rs latest release v0.24.0, 2026-10-26, so still maintained). The handoff for the contracts role must state "tests use near-workspaces" so the skill's testing advice is not followed over the stack decision. It also says "ALWAYS run `cargo near new`"; fine for a fresh crate, but it would overwrite nothing only if the crate is empty.
- C. near-intents: 1Click is documented against `https://1click.chaindefuser.com` and the skill's examples are mainnet-first. I did not verify that 1Click quotes work for NEAR testnet assets. This matches the PRD cut order ("real Intents payout: mock+log, say so"). Without an API key an extra 25 bps fee applies to quotes (skill, 2026-09-28 sync); `server-example.md` reads `PRIVATE_KEY` (an EVM key) and `ONE_CLICK_API_KEY` from env. Demo agent must use a throwaway testnet account only; no real-funds swap.
- D. near-dapp Path A runs `npx create-near-app@latest` (create-near-app v10.0.0). The repo already has a Next.js app plan, so the frontend agent must use Path B (`npm install near-connect-hooks @hot-labs/near-connect near-api-js`; near-connect-hooks 1.1.6, @hot-labs/near-connect 0.12.0 on npm) and read `node_modules/next/dist/docs/` first per AGENTS.md. Its quick-setup snippet shows `network: 'mainnet'`; set `testnet`.

Vetting notes: I read the full SKILL.md of near-smart-contracts, near-contract-audit, near-intents, near-dapp, near-cli-rs, and the first 40 lines plus URL/command grep of near-api-js (rest is API reference, no shell commands or remote URLs other than RPC endpoints and docs). I also grepped every rules/ and references/ file of the first four for curl-pipe-shell, eval, base64 decode, "ignore previous", sudo, rm -rf, webhooks, key handling. Findings: only caveat A, plus env-var private keys inside example code (`chain-signatures.md` `NEAR_PRIVATE_KEY`, `server-example.md` `PRIVATE_KEY`), which are standard example patterns and not exfiltration. near-cli-rs lists `sign-with-plaintext-private-key` and `export-account` as reference syntax; the skill itself requires showing commands for approval, and the contracts/demo agents should use `sign-with-keychain` only. No skill tells an agent to send data anywhere, disable safeguards, or act outside the project.

## Already on the machine

Read-only listing of `~/.claude/skills`, `~/.agents/skills`, `~/.claude/plugins/installed_plugins.json`, and `claude mcp list`.

Fits, so no duplicate proposed:
- Next.js / React / TS: `vercel:nextjs`, `work:nextjs-app-router` (Next.js 16 App Router, RSC, caching, hydration), `vercel:react-best-practices`, `work:react-components`, `work:react-performance`, `work:typescript-types`, `work:ui-architecture`, `work:reuse-first`, `frontend-design:frontend-design`, `design-review`, `pixel-perfect`, `imagegen-frontend`, `awwwards-*` and `gsap-*`/`motion-*` skills for the prototype-faithful UI. Vercel plugin and MCP (`plugin:vercel:vercel`, currently "tools fetch failed, request timed out") for deploying the demo URL.
- Rust: plugin `rust-analyzer-lsp@claude-plugins-official` (LSP only). No Rust-writing skill is installed.
- Process and submission: `prd`, `product-brief`, `code-review`, `security-review`, `review-edge-case-hunter`, `investigate`, `x-post` (for the X post; it queues through Buffer, so do not run it without the user), `drive-upload`. Submission role needs nothing new.
- MCP connected: `figma`, `obsidian`, `railway`, `spada`, `blender-headless`, Gmail/Drive/Calendar/Sheets, Monkies (task creation is gated by CLAUDE.md section 11, not for use here).
- Other-chain analogues present but not NEAR: `solana-dev`, `soroban`, `dapp` (Stellar), `stellar-dev` plugin, `deploy-stellar-mainnet`, `zk-proofs`, `agentic-payments`. They give structure ideas only; their chain APIs do not apply and could mislead a NEAR agent.

Missing (the reason for the proposals): any NEAR-specific skill (contracts, Intents/1Click, wallet connect, near-api-js, near CLI), any NEAR-aware audit checklist, any Rust smart-contract skill.

Toolchain observed on PATH (not installed by me, not proposed as agent installs): `cargo` and `node` present; `cargo-near` and `near` CLI not found. wasm32 target not checked.

## Rejected

| candidate | reason | URL |
|---|---|---|
| `@iqai/mcp-near-intents` MCP (IQAICom) | Third-party, not vendor (not NEAR or Defuse), 1 star, last push 2026-06-16, v0.0.11. Executes live swaps (EXECUTE_NEAR_SWAP) and needs a JWT in `NEAR_SWAP_JWT_TOKEN`; an agent-callable fund-moving tool is more risk than the demo needs. The skill plus plain `fetch` covers the same API | https://github.com/IQAIcom/mcp-near-intents ; https://www.pkgstats.com/pkg:@iqai/mcp-near-intents |
| `io.github.mastrophot/near-wallet-manager` MCP (registry) | Single community author, 0 stars, last push 2026-03-16, v0.1.1; its purpose is wallet creation and transaction signing, i.e. an agent holding keys | https://registry.modelcontextprotocol.io/v0/servers?search=near ; https://github.com/mastrophot/near-mcp-wallet-manager |
| `near-intents` skill on ClawHub (cuongdcdev) | Not vendor-maintained; the ClawScan result (reported via search snippet, not read in full by me) flags use of private keys and a live swap to a hard-coded recipient. The vendor `near-intents` skill above is used instead | https://clawhub.ai/cuongdcdev/near-intents/security/clawscan |
| `near-kit` skill (same repo) | Skill documents a third-party library (r-near/near-kit), not NEAR org code, and duplicates near-api-js for our needs. Not read in full | https://github.com/near/agent-skills/tree/main/skills/near-kit |
| `near-ai-cloud`, `near-ai`, `near-connect`, `near-connect-hooks` skills | Out of scope (NEAR AI inference), or already covered by near-dapp references (near-connect and near-connect-hooks are separate listings on skills.sh with 8 and 6 installs; near-dapp bundles the same references). Not read in full | https://skills.sh/near/agent-skills |
| near-sandbox + near-api-rs testing advice (inside near-smart-contracts) | Not a separate item; rejected as guidance because the stack is fixed to near-workspaces (caveat B) | https://github.com/near/agent-skills/blob/main/skills/near-smart-contracts/SKILL.md |
| `defuse-protocol/*` SDK repos as "tooling" | They are libraries, not agent tooling. Noted for the demo-agent as an option: `@defuse-protocol/one-click-sdk-typescript` 0.1.26 (npm), repo pushed 2026-09-22, 14 stars. A dependency decision for the demo-agent role, not an install here | https://github.com/defuse-protocol/one-click-sdk-typescript |

No NEAR plugin exists in the already-present marketplaces (`claude-plugins-official`, `claude-skills`, `claude-design-skillstack`, `anthropic-agent-skills`, `gsap-skills`, `flare-ai-skills`, `stellar-dev`): grep of marketplace.json for "near" matched only the `near` substring inside unrelated entries; the context7 external plugin is the only relevant hit. I did not search other third-party plugin marketplaces beyond web search.

## Needs the user

1. Approve or reject each row in Proposed. Recommended minimum set: near-smart-contracts (decide caveat A), near-contract-audit, near-intents, near-dapp. Optional: near-api-js, near-cli-rs, context7.
2. Decision on caveat A (the `curl | sh` Prerequisites in near-smart-contracts).
3. Keys, env var NAMES only, none needed for the proposed items to install:
   - `ONE_CLICK_API_KEY` (optional; demo-agent; avoids the extra 25 bps 1Click fee; get from https://partners.near-intents.org/). The skill's own example calls it `ONE_CLICK_API_KEY`; the IQAI MCP uses `NEAR_SWAP_JWT_TOKEN` (rejected).
   - `CONTEXT7_API_KEY` (optional; only for higher context7 rate limits).
   - A testnet signer for deploy and the demo-agent (for example `NEAR_ACCOUNT_ID`, `NEAR_PRIVATE_KEY` as used in the skill examples). Use a throwaway testnet account; I never read any `.env`.
4. Toolchain installs (outside Claude config, user machine): `cargo-near` and `near-cli-rs` are not on PATH; `rustup target add wasm32-unknown-unknown` unchecked.
5. Whether 1Click supports the NEAR testnet assets needed for the vendor payout is unverified; confirm with the Defuse docs or accept the PRD fallback (mock + log, or `ft_transfer`).
6. After approval, whoever runs the installs should re-check that `near/agent-skills` head is still `cb32b6af`, since `npx skills add` takes the latest.

## Sources

All read 2026-11-04.
- https://github.com/near/agent-skills (repo metadata, tree, README, head commit cb32b6af 2026-09-28; via `gh api`)
- https://github.com/near/agent-skills/tree/main/skills/near-smart-contracts/SKILL.md (read in full)
- https://github.com/near/agent-skills/tree/main/skills/near-contract-audit/SKILL.md (read in full)
- https://github.com/near/agent-skills/tree/main/skills/near-intents/SKILL.md (read in full) and rules/server-example.md (first 120 lines)
- https://github.com/near/agent-skills/tree/main/skills/near-dapp/SKILL.md (read in full)
- https://github.com/near/agent-skills/tree/main/skills/near-cli-rs/SKILL.md (read in full)
- https://github.com/near/agent-skills/tree/main/skills/near-api-js/SKILL.md (head and URL grep)
- https://skills.sh/near/agent-skills (install counts, no audit data shown)
- https://registry.modelcontextprotocol.io/v0/servers?search=near , ?search=intents , ?search=defuse (queried via curl)
- https://github.com/near/near-workspaces-rs (release near-workspaces-v0.24.0, 2026-10-26), https://github.com/near/cargo-near (cargo-near-v0.22.0, 2026-07-14), https://github.com/near/near-sdk-rs (515 stars, pushed 2026-11-03), https://github.com/near/create-near-app (v10.0.0), https://github.com/near/near-api-js, https://github.com/near/near-cli-rs (repo metadata via `gh api`)
- https://github.com/defuse-protocol (org repo listing via `gh search`), https://github.com/defuse-protocol/one-click-sdk-typescript
- https://docs.near-intents.org/llms.txt (reachable; docs index)
- https://github.com/upstash/context7 and npm `@upstash/context7-mcp` (npm view)
- https://www.pkgstats.com/pkg:@iqai/mcp-near-intents , https://github.com/IQAIcom/mcp-near-intents , https://github.com/mastrophot/near-mcp-wallet-manager , https://clawhub.ai/cuongdcdev/near-intents/security/clawscan (web search snippets and repo metadata only)
- Local read-only: `~/.claude/skills`, `~/.agents/skills`, `~/.claude/plugins/installed_plugins.json`, `~/.claude/plugins/marketplaces/*/marketplace.json`, `claude mcp list`, `docs/PRD.md`, `docs/research/00-brief.md`.
