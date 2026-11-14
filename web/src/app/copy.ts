import type { IconName } from './icons'
import type { Kind } from '../lib/chain/types'

export interface KindCopy {
  mandate: string
  access: readonly [string, string]
  who: string
  pay: string
  direct: string
}

export const COPY: Record<Kind, KindCopy> = {
  agent: {
    mandate:
      'Humans set the <b>constraints</b>. The agent runs the business inside them: it can draw credit, pay vendors and receive payments, nothing else.',
    access: ['Agent key', 'draw + receive only'],
    who: 'Agent business',
    pay: 'Share this link with customers or other agents.',
    direct: 'Revenue paid directly to the business wallet is not collateral. Only routed payments count.'
  },
  creator: {
    mandate:
      'You set the <b>constraints</b>. Credit pays a vendor straight from the pool, and your income arrives through the pay link.',
    access: ['Draw access', 'business account only'],
    who: 'Creator',
    pay: 'Share this link with fans, sponsors and clients. Tips, sponsor invoices and commissions all count when they are paid through it.',
    direct:
      'Income paid outside the link, such as ad revenue or card payouts, is invisible to RevVault. Only routed payments count.'
  }
}

export type ViewName = 'business' | 'loans' | 'pay' | 'lp' | 'testnet'

export const VIEWS: readonly ViewName[] = ['business', 'loans', 'pay', 'lp', 'testnet']

export const isView = (value: string): value is ViewName => (VIEWS as readonly string[]).includes(value)

export const MAIN_NAV: readonly (readonly [ViewName, IconName, string, string])[] = [
  ['business', 'home', 'Dashboard', 'Dashboard'],
  ['loans', 'loan', 'Loans', 'Loans'],
  ['pay', 'link', 'Pay links', 'Pay'],
  ['lp', 'vault', 'Notes and Vault', 'Vault']
]

export const MORE_NAV: readonly (readonly [ViewName, IconName, string, string])[] = [
  ['testnet', 'pulse', 'Testnet', 'Contracts, explorer, honesty notes']
]

export const TITLES: Record<ViewName, readonly [string, string]> = {
  business: ['Dashboard', ''],
  loans: ['Loans', 'Every draw, read from the contract'],
  pay: ['Pay links', 'Revenue routed here becomes credit'],
  lp: ['Notes and Vault', 'Revenue notes and pool shares'],
  testnet: ['Testnet', 'Deployed contracts and explorer links']
}
