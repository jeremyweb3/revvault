import { cfg, demoBusinessIds } from './config'
import { RpcError, isRecord, view } from './rpc'
import type { Credit, Kind, Loan, LoanStatus, Lp, Note, NoteStatus, Params, RevenueBucket, Status, VaultStats } from './types'

const str = (value: unknown, what: string): string => {
  if (typeof value !== 'string') throw new RpcError(`Unexpected response shape: ${what}`)
  return value
}
const num = (value: unknown, what: string): number => {
  if (typeof value !== 'number') throw new RpcError(`Unexpected response shape: ${what}`)
  return value
}
const rec = (value: unknown, what: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new RpcError(`Unexpected response shape: ${what}`)
  return value
}
const arr = (value: unknown, what: string): unknown[] => {
  if (!Array.isArray(value)) throw new RpcError(`Unexpected response shape: ${what}`)
  return value
}

const NOTE_STATUS: readonly NoteStatus[] = ['open', 'settled', 'past_due', 'written_off']
const LOAN_STATUS: readonly LoanStatus[] = ['open', 'closed', 'delinquent', 'written_off']
const STATUS: readonly Status[] = ['active', 'delinquent', 'paused']
const kindOf = (value: unknown): Kind => (value === 'creator' ? 'creator' : 'agent')

const parseNote = (value: unknown): Note => {
  const r = rec(value, 'note')
  const status = NOTE_STATUS.find((s) => s === r.status)
  if (status === undefined) throw new RpcError(`Unknown note status ${String(r.status)}`)
  return {
    id: str(r.id, 'note.id'),
    business: str(r.business, 'note.business'),
    kind: kindOf(r.kind),
    holder: str(r.holder, 'note.holder'),
    principal: str(r.principal, 'note.principal'),
    fee: str(r.fee, 'note.fee'),
    repaid: str(r.repaid, 'note.repaid'),
    repayShareBps: num(r.repay_share_bps, 'note.repay_share_bps'),
    mintedAtMs: num(r.minted_at_ms, 'note.minted_at_ms'),
    dueAtMs: num(r.due_at_ms, 'note.due_at_ms'),
    status,
    vendor: str(r.vendor, 'note.vendor'),
    memo: str(r.memo, 'note.memo')
  }
}

const parseLoan = (value: unknown): Loan => {
  const r = rec(value, 'loan')
  const status = LOAN_STATUS.find((s) => s === r.status)
  if (status === undefined) throw new RpcError(`Unknown loan status ${String(r.status)}`)
  return {
    id: str(r.id, 'loan.id'),
    business: str(r.business, 'loan.business'),
    vendor: str(r.vendor, 'loan.vendor'),
    principal: str(r.principal, 'loan.principal'),
    fee: str(r.fee, 'loan.fee'),
    repaid: str(r.repaid, 'loan.repaid'),
    openedAtMs: num(r.opened_at_ms, 'loan.opened_at_ms'),
    dueAtMs: num(r.due_at_ms, 'loan.due_at_ms'),
    memo: str(r.memo, 'loan.memo'),
    status
  }
}

const parseCredit = (value: unknown): Credit => {
  const r = rec(value, 'credit')
  const status = STATUS.find((s) => s === r.status)
  if (status === undefined) throw new RpcError(`Unknown business status ${String(r.status)}`)
  return {
    limit: str(r.limit, 'limit'),
    available: str(r.available, 'available'),
    outstanding: str(r.outstanding, 'outstanding'),
    trailingRevenue: str(r.trailing_revenue, 'trailing_revenue'),
    advanceRateBps: num(r.advance_rate_bps, 'advance_rate_bps'),
    repayShareBps: num(r.repay_share_bps, 'repay_share_bps'),
    status,
    noHistory: r.no_history === true,
    kind: kindOf(r.kind),
    effectiveSplitBps: num(r.effective_split_bps, 'effective_split_bps'),
    dueAtMs: typeof r.due_at_ms === 'number' ? r.due_at_ms : null,
    pastDue: r.past_due === true,
    attested: r.attested === true,
    estDaysToClear: typeof r.est_days_to_clear === 'number' ? r.est_days_to_clear : null
  }
}

const parseStats = (value: unknown): VaultStats => {
  const r = rec(value, 'vault stats')
  return {
    tvl: str(r.tvl, 'tvl'),
    cash: str(r.cash, 'cash'),
    reserve: str(r.reserve, 'reserve'),
    utilisationBps: num(r.utilisation_bps, 'utilisation_bps'),
    illustrativeApyBps: num(r.illustrative_apy_bps, 'illustrative_apy_bps'),
    openLoans: num(r.open_loans, 'open_loans'),
    delinquent: num(r.delinquent, 'delinquent'),
    totalShares: str(r.total_shares, 'total_shares')
  }
}

const NS_PER_DAY = 86_400_000_000_000
const parseParams = (value: unknown): Params => {
  const r = rec(value, 'params')
  return {
    feeBps: num(r.fee_bps, 'fee_bps'),
    perBizCap: str(r.per_biz_cap, 'per_biz_cap'),
    loanTermDays: Math.round(num(r.loan_term_ns, 'loan_term_ns') / NS_PER_DAY),
    graceDays: Math.round(num(r.grace_ns, 'grace_ns') / NS_PER_DAY),
    windowDays: num(r.window_days, 'window_days'),
    pastDueSplitBps: num(r.past_due_split_bps, 'past_due_split_bps'),
    reserveBps: num(r.reserve_bps, 'reserve_bps'),
    minAmount: str(r.min_amount, 'min_amount'),
    advanceBpsAgent: num(r.advance_bps_agent, 'advance_bps_agent'),
    advanceBpsCreator: num(r.advance_bps_creator, 'advance_bps_creator'),
    repayShareBpsDefault: num(r.repay_share_bps_default, 'repay_share_bps_default')
  }
}

const rv = (method: string, args: Record<string, unknown> = {}): Promise<unknown> => view(cfg.revvault, method, args)

export const readCredit = async (account: string): Promise<Credit> => parseCredit(await rv('get_credit', { account }))
export const readLoans = async (account: string): Promise<Loan[]> => arr(await rv('get_loans', { account }), 'loans').map(parseLoan)
export const readNotes = async (): Promise<Note[]> => arr(await rv('get_notes', {}), 'notes').map(parseNote)
export const readStats = async (): Promise<VaultStats> => parseStats(await rv('get_vault_stats'))
export const readParams = async (): Promise<Params> => parseParams(await rv('get_params'))
export const readRvSupply = async (): Promise<string> => str(await rv('ft_total_supply'), 'ft_total_supply')
export const readLp = async (account: string): Promise<Lp> => {
  const r = rec(await rv('get_lp', { account }), 'lp')
  return { shares: str(r.shares, 'shares'), value: str(r.value, 'value'), earned: str(r.earned, 'earned') }
}
export const readLedger = async (account: string, days: number): Promise<RevenueBucket[]> =>
  arr(await rv('get_ledger', { account, days }), 'ledger').map((b) => {
    const r = rec(b, 'ledger bucket')
    return { day: str(r.day, 'day'), amount: str(r.amount, 'amount') }
  })
export const readUsdcBalance = async (account: string): Promise<string> => str(await view(cfg.usdc, 'ft_balance_of', { account_id: account }), 'ft_balance_of')
export const readUsdcRegistered = async (account: string): Promise<boolean> => (await view(cfg.usdc, 'storage_balance_of', { account_id: account })) !== null
export const readStorageMin = async (): Promise<string> => str(rec(await view(cfg.usdc, 'storage_balance_bounds'), 'bounds').min, 'storage min')

export type Part<T> = { ok: true; value: T } | { ok: false; error: string }

const part = async <T>(p: Promise<T>): Promise<Part<T>> => {
  try {
    return { ok: true, value: await p }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Read failed' }
  }
}

export interface Snapshot {
  stats: Part<VaultStats>
  params: Part<Params>
  notes: Part<Note[]>
  rvSupply: Part<string>
  biz: string
  credit: Part<Credit>
  loans: Part<Loan[]>
  ledger: Part<RevenueBucket[]>
  /** Only when a wallet is signed in. */
  me: {
    account: string
    usdc: Part<string>
    registered: Part<boolean>
    lp: Part<Lp>
    credit: Part<Credit>
    loans: Part<Loan[]>
  } | null
  /** Pool-wide LP position of the deployer, shown when nobody is signed in. */
  seedLp: Part<Lp>
  fetchedAtMs: number
}

export const loadSnapshot = async (biz: string, me: string | null): Promise<Snapshot> => {
  const [stats, params, notes, rvSupply, credit, loans, ledger, seedLp, meParts] = await Promise.all([
    part(readStats()),
    part(readParams()),
    part(readNotes()),
    part(readRvSupply()),
    part(readCredit(biz)),
    part(readLoans(biz)),
    part(readLedger(biz, 30)),
    part(readLp(cfg.deployer)),
    me === null
      ? Promise.resolve(null)
      : Promise.all([part(readUsdcBalance(me)), part(readUsdcRegistered(me)), part(readLp(me)), part(readCredit(me)), part(readLoans(me))])
  ])
  return {
    stats,
    params,
    notes,
    rvSupply,
    biz,
    credit,
    loans,
    ledger,
    seedLp,
    me:
      me === null || meParts === null
        ? null
        : { account: me, usdc: meParts[0], registered: meParts[1], lp: meParts[2], credit: meParts[3], loans: meParts[4] },
    fetchedAtMs: Date.now()
  }
}

export const businessChoices = (me: string | null): string[] => {
  const ids = demoBusinessIds()
  return me !== null && !ids.includes(me) ? [...ids, me] : ids
}
