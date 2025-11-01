import { CELO_MAINNET_ID, BASE_MAINNET_ID } from "./constants";

export type Token = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  logo: string;
  chainId: number;
};

export const CELO_TOKENS: Token[] = [
  {
    symbol: 'CELO',
    name: 'Celo Native Asset',
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5567.png',
    chainId: CELO_MAINNET_ID,
  },
  {
    symbol: 'cUSD',
    name: 'Celo Dollar',
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7236.png',
    chainId: CELO_MAINNET_ID,
  },
  {
    symbol: 'cEUR',
    name: 'Celo Euro',
    address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/9989.png',
    chainId: CELO_MAINNET_ID,
  },
  {
    symbol: 'cREAL',
    name: 'Celo Brazilian Real',
    address: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/17790.png',
    chainId: CELO_MAINNET_ID,
  },
];

export const BASE_TOKENS: Token[] = [
    {
        symbol: 'ETH',
        name: 'Ether',
        address: '0x4200000000000000000000000000000000000006', // Special address for native ETH on Base
        decimals: 18,
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
        chainId: BASE_MAINNET_ID,
    },
    {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
        decimals: 6,
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
        chainId: BASE_MAINNET_ID,
    },
    {
        symbol: 'DEGEN',
        name: 'Degen',
        address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
        decimals: 18,
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29528.png',
        chainId: BASE_MAINNET_ID,
    }
];

export const ALL_TOKENS = [...CELO_TOKENS, ...BASE_TOKENS];

export const findTokenByAddress = (address?: string): Token | undefined => {
  if (!address) return undefined;
  return ALL_TOKENS.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
};

export const getTokensByChain = (chainId?: number): Token[] => {
    if (chainId === CELO_MAINNET_ID) return CELO_TOKENS;
    if (chainId === BASE_MAINNET_ID) return BASE_TOKENS;
    return [];
}