'use client'

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        // Environment ID - using demo ID for testing (replace with your actual ID)
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || 'ee0c9281-4ef8-4bc2-a2ab-97ac5e0be367',
        walletConnectors: [EthereumWalletConnectors],
        appName: 'Sentinel',
      }}
    >
      {children}
    </DynamicContextProvider>
  )
}