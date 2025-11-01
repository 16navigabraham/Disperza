export const CELO_MAINNET_ID = 42220;
export const BASE_MAINNET_ID = 8453;

export type NetworkConfig = {
  chainId: number;
  name: string;
  currency: string;
  explorerUrl: string;
  rpcUrl: string;
};

export const celoMainnet: NetworkConfig = {
  chainId: CELO_MAINNET_ID,
  name: 'Celo',
  currency: 'CELO',
  explorerUrl: 'https://celoscan.io',
  rpcUrl: 'https://forno.celo.org',
};

export const baseMainnet: NetworkConfig = {
  chainId: BASE_MAINNET_ID,
  name: 'Base',
  currency: 'ETH',
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org',
};

export const SUPPORTED_CHAINS = [celoMainnet, baseMainnet];

export const DISPERSION_CONTRACT_ADDRESSES: { [key: number]: `0x${string}` } = {
  [CELO_MAINNET_ID]: '0x9006151820055e7FE216866bb81E0C2d9c85dB81',
  [BASE_MAINNET_ID]: '0x89814dA44072c7476cC946802F4ABEd47Ca1C758',
};

export const NATIVE_TOKEN_ADDRESSES: { [key: number]: `0x${string}` } = {
    [CELO_MAINNET_ID]: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Common address for native Celo
    [BASE_MAINNET_ID]: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' // Common address for native ETH
}
