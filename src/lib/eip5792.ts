/*
 * EIP-5792 helper utilities for interacting with embedded wallets
 * Provides: getWalletCapabilities, sendCalls, getCallsStatus
 *
 * These functions call the provider.request API methods:
 * - wallet_getCapabilities
 * - wallet_sendCalls
 * - wallet_getCallsStatus
 *
 * If the wallet does not support atomic batch calls, callers should fall
 * back to standard `eth_sendTransaction` / `eth_getTransactionReceipt` flows.
 */

export type WalletProvider = any;

export type WalletCapabilities = {
  atomic?: 'supported' | 'ready' | 'unsupported';
  [key: string]: any;
};

export type Call = {
  to: string;
  value?: string; // hex string of wei value, e.g. '0x0'
  data?: string;
};

export async function getWalletCapabilities(provider: WalletProvider): Promise<WalletCapabilities | null> {
  if (!provider || typeof provider.request !== 'function') return null;
  try {
    const res = await provider.request({ method: 'wallet_getCapabilities' });
    // Expected to include 'atomic' capability per EIP-5792
    return res as WalletCapabilities;
  } catch (err) {
    // Some wallets may not implement the method
    console.warn('wallet_getCapabilities failed', err);
    return null;
  }
}

export type SendCallsParams = {
  from: string;
  chainId: string; // hex chain id e.g. '0xA4EC'
  atomicRequired?: boolean;
  calls: Call[];
};

export type SendCallsResult = {
  batchId?: string;
  txHash?: string; // in case wallet returns a single tx hash
  [key: string]: any;
};

export async function sendCalls(provider: WalletProvider, params: SendCallsParams): Promise<SendCallsResult | null> {
  if (!provider || typeof provider.request !== 'function') return null;
  try {
    const res = await provider.request({ method: 'wallet_sendCalls', params: [params] });
    return res as SendCallsResult;
  } catch (err: any) {
    // Pass through error so caller can fallback to eth_sendTransaction if necessary
    console.warn('wallet_sendCalls error', err);
    throw err;
  }
}

export async function getCallsStatus(provider: WalletProvider, chainId: string, batchId: string) {
  if (!provider || typeof provider.request !== 'function') return null;
  try {
    const res = await provider.request({ method: 'wallet_getCallsStatus', params: [{ chainId, batchId }] });
    return res;
  } catch (err) {
    console.warn('wallet_getCallsStatus failed', err);
    return null;
  }
}

/*
Usage example:

import { getWalletCapabilities, sendCalls, getCallsStatus } from '@/lib/eip5792';

const caps = await getWalletCapabilities(window.ethereum);
if (caps?.atomic === 'supported') {
  const payload = {
    from: address,
    chainId: '0xA4EC',
    atomicRequired: true,
    calls: [ { to, value: '0x0', data } ]
  };
  const sendRes = await sendCalls(window.ethereum, payload);
  // sendRes.batchId -> poll getCallsStatus
}

*/
