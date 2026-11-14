interface ImportMetaEnv {
  readonly VITE_NEAR_RPC_URL?: string
  readonly VITE_REVVAULT_CONTRACT_ID?: string
  readonly VITE_USDC_CONTRACT_ID?: string
  readonly VITE_DEMO_BUSINESS_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
