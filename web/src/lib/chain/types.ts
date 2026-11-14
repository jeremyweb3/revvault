export type Kind = 'agent' | 'creator'
export type NoteStatus = 'open' | 'settled' | 'past_due' | 'written_off'
export type LoanStatus = 'open' | 'closed' | 'delinquent' | 'written_off'
export type Status = 'active' | 'delinquent' | 'paused'

export interface Credit {
  limit: string
  available: string
  outstanding: string
  trailingRevenue: string
  advanceRateBps: number
  repayShareBps: number
  status: Status
  noHistory: boolean
  kind: Kind
  effectiveSplitBps: number
  dueAtMs: number | null
  pastDue: boolean
  attested: boolean
  estDaysToClear: number | null
}

export interface Loan {
  id: string
  business: string
  vendor: string
  principal: string
  fee: string
  repaid: string
  openedAtMs: number
  dueAtMs: number
  memo: string
  status: LoanStatus
}

export interface Note {
  id: string
  business: string
  kind: Kind
  holder: string
  principal: string
  fee: string
  repaid: string
  repayShareBps: number
  mintedAtMs: number
  dueAtMs: number
  status: NoteStatus
  vendor: string
  memo: string
}

export interface RevenueBucket {
  day: string
  amount: string
}

export interface VaultStats {
  tvl: string
  cash: string
  reserve: string
  utilisationBps: number
  illustrativeApyBps: number
  openLoans: number
  delinquent: number
  totalShares: string
}

export interface Lp {
  shares: string
  value: string
  earned: string
}

export interface Params {
  feeBps: number
  perBizCap: string
  loanTermDays: number
  graceDays: number
  windowDays: number
  pastDueSplitBps: number
  reserveBps: number
  minAmount: string
  advanceBpsAgent: number
  advanceBpsCreator: number
  repayShareBpsDefault: number
}
