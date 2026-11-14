import raw from '../lib/intents-preview.json'
import { fmt2 } from '../lib/engine'
import { esc } from './dom'

interface DryQuote {
  originAsset: string
  destinationAsset: string
  amountIn: bigint
  amountOut: bigint
  etaSeconds: number | null
}

interface Preview {
  generatedAt: string
  quote: DryQuote | null
  error: string | null
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const parseQuote = (value: unknown): DryQuote | null => {
  if (!isRecord(value)) return null
  const { originAsset, destinationAsset, amountIn, amountOut, etaSeconds } = value
  if (typeof originAsset !== 'string' || typeof destinationAsset !== 'string') return null
  if (typeof amountIn !== 'string' || typeof amountOut !== 'string') return null
  if (!/^\d+$/.test(amountIn) || !/^\d+$/.test(amountOut)) return null
  return {
    originAsset,
    destinationAsset,
    amountIn: BigInt(amountIn),
    amountOut: BigInt(amountOut),
    etaSeconds: typeof etaSeconds === 'number' ? etaSeconds : null
  }
}

const parsePreview = (value: unknown): Preview | null => {
  if (!isRecord(value)) return null
  if (value.mainnet !== true || value.noFundsMoved !== true) return null
  if (typeof value.generatedAt !== 'string') return null
  return {
    generatedAt: value.generatedAt,
    quote: parseQuote(value.quote),
    error: typeof value.error === 'string' ? value.error : null
  }
}

const shortAsset = (id: string): string => (id.length > 30 ? `${id.slice(0, 18)}…${id.slice(-10)}` : id)

export const intentsPreviewBlock = (): string => {
  const preview = parsePreview(raw)
  const head = '<div class="ch"><h2>Mainnet quote preview, no funds moved</h2><span class="chip warn">Dry quote</span></div>'
  if (preview === null || preview.quote === null) {
    const reason = preview?.error ?? 'No quote recorded.'
    return `<section class="card panel preview-note" aria-label="Mainnet quote preview, no funds moved">${head}<div class="empty"><b>Preview unavailable</b>${esc(reason)}</div></section>`
  }
  const q = preview.quote
  return `<section class="card panel preview-note" aria-label="Mainnet quote preview, no funds moved">${head}
    <div class="rules"><div class="rule"><span class="k">Dry quote in</span><b class="num">${fmt2(q.amountIn)}</b></div><div class="rule"><span class="k">Dry quote out</span><b class="num">${fmt2(q.amountOut)}</b></div>
    <div class="rule"><span class="k">Estimated time</span><b class="num">${q.etaSeconds === null ? 'n/a' : `${q.etaSeconds} s`}</b></div><div class="rule"><span class="k">Generated</span><b class="num">${esc(preview.generatedAt.slice(0, 10))}</b></div></div>
    <p class="hint" style="margin-top:12px">${esc(shortAsset(q.originAsset))} to ${esc(shortAsset(q.destinationAsset))}. A quote against NEAR Intents on mainnet; no transaction was sent and nothing was paid out. NEAR Intents has no testnet, so the testnet vendor payout is a direct token transfer and this demo never claims an Intents payout.</p></section>`
}
