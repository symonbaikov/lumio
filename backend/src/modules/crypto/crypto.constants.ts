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

interface PriceableAsset {
  /** Canonical ticker. What we display, and what keys the price cache. */
  ticker: string;
  coingeckoId: string;
  /**
   * Lowercase Ethereum-mainnet contract, absent for the chain's own coin and for
   * assets that live natively on another chain (MATIC, OP). An asset with no
   * contract here can never be matched against a token balance or transfer.
   */
  contract?: string;
}

/**
 * Every asset we can put a price on, and the exact contract that asset lives at.
 *
 * Contract addresses come from CoinGecko's own `platforms.ethereum` field, so the
 * thing we price and the thing we match are the same token by construction.
 */
const PRICEABLE_ASSETS: PriceableAsset[] = [
  { ticker: 'ETH', coingeckoId: 'ethereum' },
  { ticker: 'WETH', coingeckoId: 'weth', contract: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' },
  { ticker: 'USDT', coingeckoId: 'tether', contract: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
  {
    ticker: 'USDC',
    coingeckoId: 'usd-coin',
    contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  { ticker: 'DAI', coingeckoId: 'dai', contract: '0x6b175474e89094c44da98b954eedeac495271d0f' },
  {
    ticker: 'WBTC',
    coingeckoId: 'wrapped-bitcoin',
    contract: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  },
  {
    ticker: 'LINK',
    coingeckoId: 'chainlink',
    contract: '0x514910771af9ca656af840dff83e8264ecf986ca',
  },
  { ticker: 'UNI', coingeckoId: 'uniswap', contract: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' },
  { ticker: 'AAVE', coingeckoId: 'aave', contract: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9' },
  { ticker: 'MATIC', coingeckoId: 'matic-network' },
  {
    ticker: 'ARB',
    coingeckoId: 'arbitrum',
    contract: '0xb50721bcf8d664c30412cfbc6cf7a15145234ad1',
  },
  { ticker: 'OP', coingeckoId: 'optimism' },
  {
    ticker: 'LDO',
    coingeckoId: 'lido-dao',
    contract: '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
  },
  {
    ticker: 'SHIB',
    coingeckoId: 'shiba-inu',
    contract: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
  },
  { ticker: 'PEPE', coingeckoId: 'pepe', contract: '0x6982508145454ce325ddbe47a25d4ec3d2311933' },
  {
    ticker: 'CRV',
    coingeckoId: 'curve-dao-token',
    contract: '0xd533a949740bb3306d119cc777fa900ba034cd52',
  },
  { ticker: 'MKR', coingeckoId: 'maker', contract: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2' },
  {
    ticker: 'ENS',
    coingeckoId: 'ethereum-name-service',
    contract: '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
  },
];

/** CoinGecko ids for the assets we can price. Anything absent prices as null. */
export const COINGECKO_IDS: Record<string, string> = Object.fromEntries(
  PRICEABLE_ASSETS.map(asset => [asset.ticker, asset.coingeckoId]),
);

/**
 * Lowercase contract address to canonical ticker, per chain.
 *
 * This is the spam filter, and it is why a token's own `symbol` is never trusted:
 * anyone can deploy a contract calling itself `USDT`, and pricing it by that name
 * would credit the holder with money they do not have. A contract absent from this
 * table has no price and is ignored — which is also what happens to the homoglyph
 * tickers (`ꓴꓢꓓꓔ`) that airdrop spam likes to use.
 *
 * Addresses are chain-specific: a new chain needs its own block, not a reuse of
 * this one.
 */
export const TICKER_BY_CONTRACT: Record<number, Record<string, string>> = {
  1: Object.fromEntries(
    PRICEABLE_ASSETS.filter(asset => asset.contract).map(asset => [asset.contract, asset.ticker]),
  ),
};
