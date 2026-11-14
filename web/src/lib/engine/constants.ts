export const BPS = 10_000n
export const USDC_UNIT = 1_000_000n
export const DAY_MS = 86_400_000

export const usdc = (whole: number): bigint => BigInt(whole) * USDC_UNIT

// Display constants for the landing page and the terms card. The contract is the source of
// truth for the app: it reads get_params and get_credit; nothing in the app computes a limit.
export const P = {
  advanceBps: { agent: 4000, creator: 3000 },
  cap: usdc(2000),
  feeBps: 300,
  termDays: 60,
  windowDays: 30,
  reserveBps: 5000,
  splitBps: 2000,
  pastDueSplitBps: 5000,
  graceDays: 14,
  starterLimit: 0n,
  maxDraw: usdc(500),
  minDraw: usdc(10)
} as const
