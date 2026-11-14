import { BPS } from './constants'

export const minBig = (a: bigint, b: bigint): bigint => (a < b ? a : b)
export const maxBig = (a: bigint, b: bigint): bigint => (a > b ? a : b)

export const mulBpsUp = (amount: bigint, bps: number): bigint => (amount * BigInt(bps) + BPS - 1n) / BPS
export const mulBpsDown = (amount: bigint, bps: number): bigint => (amount * BigInt(bps)) / BPS

export const feeOf = (principal: bigint, feeBps: number): bigint => mulBpsUp(principal, feeBps)

export const creditLimit = (routed: bigint, advanceBps: number, cap: bigint, starterLimit: bigint): bigint => {
  if (routed === 0n) return starterLimit
  return minBig(mulBpsDown(routed, advanceBps), cap)
}

export interface PaymentQuote {
  repay: bigint
  toBusiness: bigint
  debtLeft: bigint
}

export const quotePayment = (amount: bigint, splitBps: number, debtLeft: bigint): PaymentQuote => {
  const repay = minBig(mulBpsUp(amount, splitBps), debtLeft)
  return { repay, toBusiness: amount - repay, debtLeft: debtLeft - repay }
}

export const feePart = (slice: bigint, principal: bigint, fee: bigint, repaidBefore: bigint, feeRepaidBefore: bigint): bigint => {
  const total = principal + fee
  const feeLeft = fee - feeRepaidBefore
  if (repaidBefore + slice >= total) return feeLeft
  return minBig(minBig((slice * fee) / total, feeLeft), slice)
}

export const estDaysToClear = (debtLeft: bigint, trailing: bigint, windowDays: number, splitBps: number): number | null => {
  if (debtLeft === 0n || trailing === 0n || splitBps === 0 || windowDays === 0) return null
  const numerator = debtLeft * BigInt(windowDays) * BPS
  const denominator = trailing * BigInt(splitBps)
  const quotient = numerator / denominator
  return Number(numerator % denominator === 0n ? quotient : quotient + 1n)
}

export const illustrativeApyBps = (feeBps: number, termDays: number, utilisationBps: number, reserveBps: number): number => {
  const numerator = BigInt(feeBps) * 365n * BigInt(utilisationBps) * (BPS - BigInt(reserveBps))
  return Number(numerator / (BigInt(termDays) * BPS * BPS))
}
