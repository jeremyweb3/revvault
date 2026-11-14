import { NearConnector } from '@hot-labs/near-connect'
import type { NearWalletBase } from '@hot-labs/near-connect'
import { NETWORK } from './config'
import { accountExists } from './rpc'

export class WalletError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WalletError'
  }
}

// Testnet wallets only. features.testnet filters the selector; network is also passed on every call.
const connector = new NearConnector({ network: NETWORK, features: { testnet: true } })

let account: string | null = null
const listeners = new Set<(id: string | null) => void>()

const emit = (): void => listeners.forEach((fn) => fn(account))
export const onAccountChange = (fn: (id: string | null) => void): void => {
  listeners.add(fn)
}
export const signedInAccount = (): string | null => account

// Refuse anything that is not clearly a testnet account: mainnet names end in .near, and an
// implicit (hex) account must exist on the testnet RPC.
const assertTestnetAccount = async (id: string): Promise<void> => {
  if (/\.near$/i.test(id) || id.toLowerCase() === 'near') {
    throw new WalletError(`Wrong network: ${id} looks like a mainnet account. RevVault only works on testnet. Switch your wallet to testnet and use a throwaway account.`)
  }
  let exists: boolean
  try {
    exists = await accountExists(id)
  } catch {
    exists = true // RPC hiccup: the next read will surface it, do not block sign-in on it
  }
  if (!exists) throw new WalletError(`${id} does not exist on NEAR testnet. Use a throwaway testnet account.`)
}

const adopt = async (id: string | null): Promise<void> => {
  if (id !== null) {
    try {
      await assertTestnetAccount(id)
    } catch (error) {
      await connector.disconnect().catch(() => undefined)
      account = null
      emit()
      throw error
    }
  }
  account = id
  emit()
}

connector.on('wallet:signIn', (e) => {
  const id = e.accounts[0]?.accountId ?? null
  void adopt(id).catch((error: unknown) => window.dispatchEvent(new CustomEvent('rv:wallet-error', { detail: error instanceof Error ? error.message : 'Sign-in refused' })))
})
connector.on('wallet:signOut', () => {
  account = null
  emit()
})

export const restoreSession = async (): Promise<void> => {
  try {
    const { accounts } = await connector.getConnectedWallet()
    const id = accounts[0]?.accountId ?? null
    if (id !== null) await adopt(id)
  } catch {
    /* not signed in */
  }
}

export const signIn = async (): Promise<void> => {
  await connector.connect()
}

export const signOut = async (): Promise<void> => {
  await connector.disconnect()
  account = null
  emit()
}

export const activeWallet = async (): Promise<NearWalletBase> => {
  if (account === null) throw new WalletError('Connect a testnet wallet first.')
  try {
    return await connector.wallet()
  } catch {
    throw new WalletError('Wallet session expired. Connect again.')
  }
}
