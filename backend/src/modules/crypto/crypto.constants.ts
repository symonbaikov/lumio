/**
 * The sync provider (Blockscout) is pinned to its Ethereum-mainnet host in
 * crypto-sync.service.ts. Adding a chain id here is NOT enough: without a
 * per-chain host the sync would silently pull mainnet transactions into
 * wallets on the other chain.
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
