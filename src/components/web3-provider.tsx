"use client";

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import type { ReactNode } from 'react';
import { celoMainnet } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const metadata = {
  name: 'Disperza',
  description: 'A dApp for multi-sending tokens on Celo',
  url: 'https://disperza.app',
  icons: ['https://disperza.app/logo.png'],
};

if (projectId) {
  createWeb3Modal({
    ethersConfig: defaultConfig({
      metadata,
      defaultChainId: celoMainnet.chainId,
      rpcUrl: celoMainnet.rpcUrl,
    }),
    chains: [celoMainnet],
    projectId,
    enableAnalytics: true,
    themeMode: 'light',
    themeVariables: {
      '--w3m-color-mix': 'hsl(var(--primary))',
      '--w3m-accent': 'hsl(var(--primary))',
      '--w3m-border-radius-master': 'var(--radius)',
      '--w3m-font-family': 'Inter, sans-serif',
    }
  });
}


export function Web3Provider({ children }: { children: ReactNode }) {
  if (!projectId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            <p>Your WalletConnect Project ID is not configured.</p>
            <p className="mt-2">Please create a <code>.env.local</code> file in the root of your project and add the following line:</p>
            <pre className="mt-2 px-2 py-1 rounded-md bg-muted text-sm">
              NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here
            </pre>
            <p className="mt-2">You can get a project ID from <a href="https://cloud.walletconnect.com" target="_blank" rel="noopener noreferrer" className="underline">WalletConnect Cloud</a>.</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  return <>{children}</>;
}
