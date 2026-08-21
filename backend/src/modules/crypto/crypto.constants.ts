/**
 * Etherscan's V2 API is one host and one key for every chain — the chain is just
 * a query parameter — so widening this list is the whole cost of a new network.
 */
export const SUPPORTED_CHAIN_IDS = [1] as const;

export const DEFAULT_CHAIN_ID = 1;

/** Ticker of the chain's own coin, used for gas and plain transfers. */
export const NATIVE_ASSET_BY_CHAIN: Record<number, string> = {
  1: 'ETH',
};

export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
};

/** CoinGecko ids for the assets we can price. Anything absent is treated as spam. */
export const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'weth',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
  WBTC: 'wrapped-bitcoin',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  MATIC: 'matic-network',
  ARB: 'arbitrum',
  OP: 'optimism',
  LDO: 'lido-dao',
  SHIB: 'shiba-inu',
  PEPE: 'pepe',
  CRV: 'curve-dao-token',
  MKR: 'maker',
  ENS: 'ethereum-name-service',
};
