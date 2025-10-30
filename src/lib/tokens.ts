export type Token = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  logo: string;
};

export const CELO_TOKENS: Token[] = [
  {
    symbol: 'CELO',
    name: 'Celo Native Asset',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Zero address for native asset
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5567.png',
  },
  {
    symbol: 'cUSD',
    name: 'Celo Dollar',
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7236.png',
  },
  {
    symbol: 'cEUR',
    name: 'Celo Euro',
    address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/9989.png',
  },
  {
    symbol: 'cREAL',
    name: 'Celo Brazilian Real',
    address: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
    decimals: 18,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/17790.png',
  },
];

export const findTokenByAddress = (address?: string): Token | undefined => {
  if (!address) return undefined;
  return CELO_TOKENS.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
};
