import { CELO_MAINNET_ID, BASE_MAINNET_ID, NATIVE_TOKEN_ADDRESSES } from "./constants";

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
    address: NATIVE_TOKEN_ADDRESSES[CELO_MAINNET_ID],
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
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
        decimals: 6,
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
        chainId: BASE_MAINNET_ID,
    },
    {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
        decimals: 6,
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
        chainId: BASE_MAINNET_ID,
    },
    {
        symbol: 'ZORA',
        name: 'Zora',
        address: '0x1111111111166b7FE7bd91427724B487980aFc69',
        decimals: 18,
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28169.png',
        chainId: BASE_MAINNET_ID,
    },
    {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18,
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2396.png',
        chainId: BASE_MAINNET_ID,
    },
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
