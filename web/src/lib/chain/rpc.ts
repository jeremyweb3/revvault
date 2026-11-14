import { cfg } from './config'

const RPC_TIMEOUT_MS = 12_000

export class RpcError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RpcError'
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

// The public testnet RPC rate-limits bursts (HTTP 429 without CORS headers, which the browser reports as "Failed to fetch").
// So: at most MAX_CONCURRENT requests in flight, and a few retries that rotate through fallback endpoints.
const MAX_CONCURRENT = 3
const MAX_ATTEMPTS = 4
let inFlight = 0
const waiting: Array<() => void> = []
const acquire = async (): Promise<void> => {
  if (inFlight >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve))
  inFlight += 1
}
const release = (): void => {
  inFlight -= 1
  waiting.shift()?.()
}
const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms))
const endpoints = [cfg.rpcUrl, ...cfg.rpcFallbacks.filter((u) => u !== cfg.rpcUrl)]

const post = async (payload: string): Promise<Response> => {
  let failure = ''
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const url = endpoints[attempt % endpoints.length] ?? cfg.rpcUrl
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), RPC_TIMEOUT_MS)
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal, body: payload })
      if (response.status !== 429 && response.status < 500) return response
      failure = `RPC answered HTTP ${response.status} (${url})`
    } catch (error) {
      failure = controller.signal.aborted
        ? `RPC timed out after ${RPC_TIMEOUT_MS / 1000}s (${url})`
        : `RPC unreachable (${url}): ${error instanceof Error ? error.message : 'network error'}`
    } finally {
      window.clearTimeout(timer)
    }
    if (attempt < MAX_ATTEMPTS - 1) await sleep(350 * (attempt + 1) + Math.random() * 250)
  }
  throw new RpcError(failure)
}

export const rpc = async (method: string, params: unknown): Promise<Record<string, unknown>> => {
  await acquire()
  let response: Response
  try {
    response = await post(JSON.stringify({ jsonrpc: '2.0', id: 'revvault', method, params }))
  } finally {
    release()
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
