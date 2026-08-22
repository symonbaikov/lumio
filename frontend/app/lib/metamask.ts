/**
 * Minimal EIP-1193 access to an injected browser wallet.
 *
 * A wallet library (wagmi, RainbowKit, WalletConnect) would buy multi-wallet
 * support and session handling we do not need: all we ever ask the wallet for is
 * the public address it is already willing to announce. No signing, no private
 * key, no transaction ever leaves this file.
 */

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function getProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const provider = (window as { ethereum?: Eip1193Provider }).ethereum;
  return provider ?? null;
}

export function isWalletAvailable(): boolean {
  return getProvider() !== null;
}

export class WalletUnavailableError extends Error {
  constructor() {
    super('No browser wallet detected');
    this.name = 'WalletUnavailableError';
  }
}

/**
 * Opens the wallet's account prompt and returns the selected address.
 * Rejects with `WalletUnavailableError` when no wallet is installed, so the
 * caller can fall back to asking the user to paste an address.
 */
export async function requestWalletAddress(): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new WalletUnavailableError();
  }

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as unknown;
  const address = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof address !== 'string' || !address) {
    throw new Error('Wallet returned no account');
  }
  return address.toLowerCase();
}

/** The chain the wallet is currently pointed at, as a decimal chain id. */
export async function getWalletChainId(): Promise<number | null> {
  const provider = getProvider();
  if (!provider) {
    return null;
  }
  try {
    const chainId = (await provider.request({ method: 'eth_chainId' })) as unknown;
    return typeof chainId === 'string' ? Number.parseInt(chainId, 16) : null;
  } catch {
    return null;
  }
}
