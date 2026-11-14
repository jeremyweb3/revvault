import { cfg } from './config'

const RPC_TIMEOUT_MS = 12_000

export class RpcError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RpcError'
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const rpc = async (method: string, params: unknown): Promise<Record<string, unknown>> => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), RPC_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(cfg.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ jsonrpc: '2.0', id: 'revvault', method, params })
    })
  } catch (error) {
    if (controller.signal.aborted) throw new RpcError(`RPC timed out after ${RPC_TIMEOUT_MS / 1000}s (${cfg.rpcUrl})`)
    throw new RpcError(`RPC unreachable (${cfg.rpcUrl}): ${error instanceof Error ? error.message : 'network error'}`)
  } finally {
    window.clearTimeout(timer)
  }
  if (!response.ok) throw new RpcError(`RPC answered HTTP ${response.status} (${cfg.rpcUrl})`)
  const body: unknown = await response.json().catch(() => null)
  if (!isRecord(body)) throw new RpcError('RPC answered with something that is not JSON')
  if (body.error !== undefined) {
    const e = body.error
    const cause = isRecord(e) && isRecord(e.cause) && typeof e.cause.name === 'string' ? e.cause.name : ''
    const msg = isRecord(e) && typeof e.message === 'string' ? e.message : 'unknown'
    throw new RpcError(`RPC error: ${msg}${cause === '' ? '' : ` (${cause})`}`)
  }
  if (!isRecord(body.result)) throw new RpcError('RPC result missing')
  return body.result
}

export const view = async (account: string, method: string, args: Record<string, unknown> = {}): Promise<unknown> => {
  const result = await rpc('query', {
    request_type: 'call_function',
    finality: 'final',
    account_id: account,
    method_name: method,
    args_base64: btoa(JSON.stringify(args))
  })
  if (typeof result.error === 'string') throw new RpcError(`${method} failed: ${result.error.slice(0, 200)}`)
  const bytes = result.result
  if (!Array.isArray(bytes) || !bytes.every((b): b is number => typeof b === 'number')) throw new RpcError(`${method}: empty result`)
  try {
    return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))
  } catch {
    throw new RpcError(`${method}: result is not JSON`)
  }
}

export const accountExists = async (accountId: string): Promise<boolean> => {
  try {
    await rpc('query', { request_type: 'view_account', finality: 'final', account_id: accountId })
    return true
  } catch (error) {
    if (error instanceof RpcError && /UnknownAccount|does not exist/i.test(error.message)) return false
    throw error
  }
}
