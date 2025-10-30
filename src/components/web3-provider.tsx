"use client";

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import type { ReactNode } from 'react';
import { celoMainnet } from '@/lib/constants';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "d1d71705a5a133b37a50f3856b3724c9";

if (!projectId) {
  throw new Error('You need to provide NEXT_PUBLIC_WC_PROJECT_ID env variable');
}

const metadata = {
  name: 'Disperza',
  description: 'A dApp for multi-sending tokens on Celo',
  url: 'https://disperza.app',
  icons: ['https://disperza.app/logo.png'],
};

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

export function Web3Provider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
