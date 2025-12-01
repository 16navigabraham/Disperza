"use client";

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import type { ReactNode } from 'react';
import { celoMainnet, SUPPORTED_CHAINS } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const metadata = {
  name: 'Disperza',
  description: 'Send tokens to multiple addresses in one transaction on Celo & Base',
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
    chains: SUPPORTED_CHAINS,
    projectId,
    enableAnalytics: true,
    themeMode: 'light',
    themeVariables: {
      '--w3m-color-mix': 'hsl(var(--primary))',
      '--w3m-accent': 'hsl(var(--primary))',
      '--w3m-border-radius-master': 'var(--radius)',
      '--w3m-font-family': 'Inter, sans-serif',
    },
    // Disable social/email login - only show external wallets
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
      'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // Uniswap
    ],
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
            <p>Missing WalletConnect Project ID.</p>
            <p className="mt-2">Please create a <code>.env.local</code> file in the root of your project and add the following line:</p>
            <pre className="mt-2 px-2 py-1 rounded-md bg-muted text-sm">
              NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here
            </pre>
            <p className="mt-2">You can get a project ID from <a href="https://cloud.walletconnect.com" target="_blank" rel="noopener noreferrer" className="underline">WalletConnect Cloud</a>.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
