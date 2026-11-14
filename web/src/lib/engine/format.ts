import { USDC_UNIT } from './constants'

const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export const fmt2 = (micro: bigint): string => {
  const negative = micro < 0n
  const abs = negative ? -micro : micro
  const cents = (abs + 5_000n) / 10_000n
  const whole = cents / 100n
  const frac = (cents % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${group(whole.toString())}.${frac}`
}

export const fmt0 = (micro: bigint): string => {
  const negative = micro < 0n
  const abs = negative ? -micro : micro
  const whole = (abs + USDC_UNIT / 2n) / USDC_UNIT
  return `${negative ? '-' : ''}${group(whole.toString())}`
}

export const fmtScaled4 = (numerator: bigint, denominator: bigint): string => {
  if (denominator === 0n) return '0.0000'
  const scaled = (numerator * 10_000n) / denominator
  const whole = scaled / 10_000n
  return `${group(whole.toString())}.${(scaled % 10_000n).toString().padStart(4, '0')}`
}

export const pctOf = (part: bigint, whole: bigint): number => {
  if (whole === 0n) return 0
  return Number((part * 10_000n) / whole) / 100
}

export const toNumber = (micro: bigint): number => Number(micro) / 1_000_000

export const bpsToPct = (bps: number): number => bps / 100

export const parseUsdc = (text: string): bigint | null => {
  const match = /^\s*(\d+)(?:\.(\d{1,6}))?\s*$/.exec(text)
  if (match === null) return null
  const whole = match[1]
  if (whole === undefined) return null
  const frac = (match[2] ?? '').padEnd(6, '0')
  return BigInt(whole) * USDC_UNIT + BigInt(frac === '' ? '0' : frac)
}
