import { NETWORK, cfg } from './config'
import { fmt2 } from '../engine'
import { RpcError, isRecord, rpc } from './rpc'
import { WalletError, activeWallet, signedInAccount } from './wallet'

export const TGAS = (n: number): string => (BigInt(n) * 1_000_000_000_000n).toString()

export class TxError extends Error {
  readonly hash: string | null
  constructor(message: string, hash: string | null) {
    super(message)
    this.name = 'TxError'
    this.hash = hash
  }
}

export interface TxResult {
  hash: string
  /** Decoded SuccessValue of the whole call tree, null when empty. */
  value: unknown
}

interface Call {
  receiverId: string
  method: string
  args: Record<string, unknown>
  gas: number
  /** yoctoNEAR */
  deposit?: string
}

const findExecutionError = (node: unknown): string | null => {
  if (typeof node === 'string') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findExecutionError(item)
      if (hit !== null) return hit
    }
    return null
  }
  if (!isRecord(node)) return null
  const direct = node.ExecutionError
  if (typeof direct === 'string') return direct
  for (const value of Object.values(node)) {
    const hit = findExecutionError(value)
    if (hit !== null) return hit
  }
  return null
}

export const friendlyFailure = (failure: unknown): string => {
  const exec = findExecutionError(failure)
  if (exec !== null) {
    const m = /Smart contract panicked: (.*)$/s.exec(exec)
    const text = (m?.[1] ?? exec).trim()
    if (/not registered|storage/i.test(text) && /account|registered/i.test(text)) return `Unregistered account: ${text}. Register it for USDC first.`
    if (/balance/i.test(text) && /enough|insufficient|exceed/i.test(text)) return `Insufficient balance: ${text}`
    return text
  }
  const raw = JSON.stringify(failure)
  if (/NotEnoughBalance|LackBalanceForState/.test(raw)) return 'Insufficient NEAR in your throwaway account for gas or the deposit.'
  if (/GasExceeded|GasLimit/.test(raw)) return 'Out of gas.'
  return raw.length > 240 ? `${raw.slice(0, 240)}…` : raw
}

const decodeValue = (status: unknown): unknown => {
  if (!isRecord(status) || typeof status.SuccessValue !== 'string' || status.SuccessValue === '') return null
  try {
    return JSON.parse(atob(status.SuccessValue))
  } catch {
    return null
  }
}

/** Reads a FinalExecutionOutcome (wallet or RPC shape). Returns the first failure found anywhere in it. */
const parseOutcome = (outcome: unknown): { hash: string | null; failure: unknown; value: unknown } => {
  if (!isRecord(outcome)) return { hash: null, failure: null, value: null }
  const tx = outcome.transaction
  const hash = isRecord(tx) && typeof tx.hash === 'string' ? tx.hash : null
  let failure: unknown = null
  const status = outcome.status
  if (isRecord(status) && status.Failure !== undefined) failure = status.Failure
  const receipts = outcome.receipts_outcome
  if (failure === null && Array.isArray(receipts)) {
    for (const r of receipts) {
      const st = isRecord(r) && isRecord(r.outcome) ? r.outcome.status : null
      if (isRecord(st) && st.Failure !== undefined) {
        failure = st.Failure
        break
      }
    }
  }
  return { hash, failure, value: decodeValue(status) }
}

const waitFinal = async (hash: string, signer: string): Promise<unknown> => {
  try {
    return await rpc('tx', { tx_hash: hash, sender_account_id: signer, wait_until: 'FINAL' })
  } catch (error) {
    if (error instanceof RpcError) return null
    throw error
  }
}

export const call = async (c: Call): Promise<TxResult> => {
  const signer = signedInAccount()
  if (signer === null) throw new WalletError('Connect a testnet wallet first.')
  const wallet = await activeWallet()
  let outcome: unknown
  try {
    outcome = await wallet.signAndSendTransaction({
      network: NETWORK,
      signerId: signer,
      receiverId: c.receiverId,
      actions: [{ type: 'FunctionCall', params: { methodName: c.method, args: c.args, gas: TGAS(c.gas), deposit: c.deposit ?? '0' } }]
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/reject|cancel|denied|declin/i.test(message)) throw new TxError('You rejected the transaction in your wallet.', null)
    throw new TxError(`Wallet error: ${message}`, null)
  }
  const first = parseOutcome(outcome)
  if (first.hash === null) throw new TxError('The wallet did not return a transaction hash. Check the explorer before retrying.', null)
  // Wallets may return before every receipt finished; ask the RPC for the final status of the whole tree.
  const final = await waitFinal(first.hash, signer)
  const parsed = final === null ? first : parseOutcome(final)
  const failure = parsed.failure ?? first.failure
  if (failure !== null) throw new TxError(friendlyFailure(failure), first.hash)
  return { hash: first.hash, value: final === null ? first.value : parsed.value }
}

const usedAmount = (value: unknown): bigint | null => {
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value)
  return null
}

/** ft_transfer_call returns the amount the receiver kept. Less than sent means the vault refunded it. */
const checkKept = (r: TxResult, sent: bigint, why: string): TxResult => {
  const kept = usedAmount(r.value)
  if (kept !== null && kept < sent) {
    throw new TxError(`The vault refunded ${fmt2(sent - kept)} USDC. ${why}`, r.hash)
  }
  return r
}

const REFUND_HINT = 'Reasons: below the 1 USDC minimum, a payer paying itself, or an unusable business id.'

export const mintUsdc = (to: string, amount: bigint): Promise<TxResult> =>
  call({ receiverId: cfg.usdc, method: 'mint', args: { account_id: to, amount: amount.toString() }, gas: 30 })

export const registerUsdc = (account: string, minDeposit: string): Promise<TxResult> =>
  call({ receiverId: cfg.usdc, method: 'storage_deposit', args: { account_id: account, registration_only: true }, gas: 30, deposit: minDeposit })

export const lpDeposit = async (amount: bigint): Promise<TxResult> =>
  checkKept(
    await call({ receiverId: cfg.usdc, method: 'ft_transfer_call', args: { receiver_id: cfg.revvault, amount: amount.toString(), msg: JSON.stringify({ action: 'lp_deposit' }) }, gas: 150, deposit: '1' }),
    amount,
    'The minimum LP deposit is 1 USDC.'
  )

export const payThroughLink = async (biz: string, amount: bigint, ref: string): Promise<TxResult> =>
  checkKept(
    await call({ receiverId: cfg.usdc, method: 'ft_transfer_call', args: { receiver_id: cfg.revvault, amount: amount.toString(), msg: JSON.stringify({ action: 'pay', biz, ref }) }, gas: 150, deposit: '1' }),
    amount,
    REFUND_HINT
  )

export const lpWithdraw = (shares: bigint): Promise<TxResult> =>
  call({ receiverId: cfg.revvault, method: 'lp_withdraw', args: { shares: shares.toString() }, gas: 100, deposit: '1' })

export const registerBusiness = (kind: 'agent' | 'creator'): Promise<TxResult> =>
  call({ receiverId: cfg.revvault, method: 'register_business', args: { kind }, gas: 30 })

export const requestDraw = async (amount: bigint, vendor: string, memo: string): Promise<TxResult> => {
  const r = await call({ receiverId: cfg.revvault, method: 'request_draw', args: { amount: amount.toString(), vendor, memo }, gas: 150 })
  if (r.value === null) throw new TxError('The vendor transfer failed, so the draw was reverted. Check that the vendor account is registered for USDC.', r.hash)
  return r
}

export const poke = (biz: string): Promise<TxResult> => call({ receiverId: cfg.revvault, method: 'poke', args: { biz }, gas: 100 })
