import deployment from '../deployment.json'

// Testnet only. There is no mode switch: every read and write targets these contracts.
export const NETWORK = 'testnet' as const
export const EXPLORER = 'https://explorer.testnet.near.org'

const pick = (value: string | undefined, fallback: string): string => (value !== undefined && value.trim() !== '' ? value.trim() : fallback)
const env = import.meta.env

export const cfg = {
  network: NETWORK,
  rpcUrl: pick(env.VITE_NEAR_RPC_URL, 'https://test.rpc.fastnear.com'),
  revvault: pick(env.VITE_REVVAULT_CONTRACT_ID, deployment.contracts.revvault),
  usdc: pick(env.VITE_USDC_CONTRACT_ID, deployment.contracts.usdc),
  deployer: deployment.deployer,
  businesses: {
    agent: deployment.demo_accounts.biz_agent,
    creator: deployment.demo_accounts.biz_creator
  },
  vendors: deployment.demo_accounts.vendors,
  payer: deployment.demo_accounts.payer
} as const

export const demoBusinessIds = (): string[] => {
  const only = env.VITE_DEMO_BUSINESS_ID
  return only !== undefined && only.trim() !== '' ? [only.trim()] : [cfg.businesses.agent, cfg.businesses.creator]
}

export const accountUrl = (id: string): string => `${EXPLORER}/accounts/${id}`
export const txUrl = (hash: string): string => `${EXPLORER}/transactions/${hash}`

export interface ExplorerLink {
  label: string
  href: string
}

const SEED_LINKS: readonly (readonly [string, string])[] = [
  ['LP deposit, 10,000 mock USDC', 'lp_deposit'],
  ['Agent draw ln_001', 'draw:agent'],
  ['Repay split raised to 90%', 'repay_share:agent'],
  ['Agent payment that settled ln_001', 'pay:agent:repay'],
  ['Creator draw ln_002 (left open)', 'draw:creator']
]

export const explorerLinks = (): { contracts: ExplorerLink[]; accounts: ExplorerLink[]; txs: ExplorerLink[] } => {
  const seedTx: Record<string, string> = deployment.seed.txs
  const deployTx: Record<string, string> = deployment.txs
  const txs: ExplorerLink[] = []
  const add = (label: string, hash: string | undefined): void => {
    if (hash !== undefined) txs.push({ label, href: txUrl(hash) })
  }
  add('RevVault deploy', deployTx[`deploy:${deployment.contracts.revvault}`])
  add('Mock USDC deploy', deployTx[`deploy:${deployment.contracts.usdc}`])
  for (const [label, key] of SEED_LINKS) add(label, seedTx[key])
  return {
    contracts: [
      { label: `RevVault ${cfg.revvault}`, href: accountUrl(cfg.revvault) },
      { label: `Mock USDC ${cfg.usdc}`, href: accountUrl(cfg.usdc) }
    ],
    accounts: [
      ...demoBusinessIds().map((id) => ({ label: id, href: accountUrl(id) })),
      ...cfg.vendors.map((id) => ({ label: id, href: accountUrl(id) }))
    ],
    txs
  }
}
