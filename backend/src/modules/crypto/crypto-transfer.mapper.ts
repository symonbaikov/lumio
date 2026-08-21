/**
 * Turns raw block-explorer rows into the transfers we actually book.
 *
 * Kept free of I/O so the rules that decide what counts as income, what counts
 * as an expense, and what counts as nothing at all can be tested directly.
 */

/** A row from Etherscan's `txlist` action. Only the fields we read are declared. */
export interface EtherscanTx {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  isError?: string;
}

/** A row from Etherscan's `tokentx` action (ERC-20 transfers). */
export interface EtherscanTokenTx {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: string;
}

export interface ChainTransfer {
  hash: string;
  /** Seconds since epoch, as the explorer reports it. */
  timestamp: number;
  asset: string;
  /** Native amount as a positive decimal string, e.g. `0.184`. */
  amount: string;
  direction: 'in' | 'out';
  /** The other address, lowercase. Empty for contract creation. */
  counterparty: string;
}

export interface MapTransfersInput {
  address: string;
  nativeAsset: string;
  /** Every address the workspace watches, used to drop internal moves. */
  ownAddresses: string[];
  transactions: EtherscanTx[];
  tokenTransfers: EtherscanTokenTx[];
}

/**
 * Money moving between two wallets the same workspace owns is not income and not
 * an expense — booking both legs would inflate every total on the dashboard.
 * The gas such a move burns is a genuine expense and is still booked.
 */
export function mapChainTransfers(input: MapTransfersInput): ChainTransfer[] {
  const me = input.address.toLowerCase();
  const own = new Set(input.ownAddresses.map(address => address.toLowerCase()));
  const transfers: ChainTransfer[] = [];

  for (const tx of input.transactions) {
    const from = tx.from.toLowerCase();
    const to = (tx.to ?? '').toLowerCase();
    const isOutgoing = from === me;

    // Gas is paid by the sender even when the transaction reverts.
    if (isOutgoing) {
      const gas = toBigInt(tx.gasUsed) * toBigInt(tx.gasPrice);
      if (gas > 0n) {
        transfers.push({
          hash: tx.hash,
          timestamp: Number(tx.timeStamp),
          asset: input.nativeAsset,
          amount: formatUnits(gas, 18),
          direction: 'out',
          counterparty: to,
        });
      }
    }

    // A reverted transaction moved no value, only gas.
    if (tx.isError === '1') {
      continue;
    }

    const value = toBigInt(tx.value);
    if (value === 0n) {
      continue;
    }

    const counterparty = isOutgoing ? to : from;
    if (own.has(counterparty)) {
      continue;
    }

    transfers.push({
      hash: tx.hash,
      timestamp: Number(tx.timeStamp),
      asset: input.nativeAsset,
      amount: formatUnits(value, 18),
      direction: isOutgoing ? 'out' : 'in',
      counterparty,
    });
  }

  for (const transfer of input.tokenTransfers) {
    const from = transfer.from.toLowerCase();
    const to = transfer.to.toLowerCase();
    const isOutgoing = from === me;
    const counterparty = isOutgoing ? to : from;
    if (own.has(counterparty)) {
      continue;
    }

    const value = toBigInt(transfer.value);
    if (value === 0n) {
      continue;
    }

    transfers.push({
      hash: transfer.hash,
      timestamp: Number(transfer.timeStamp),
      asset: transfer.tokenSymbol.toUpperCase(),
      amount: formatUnits(value, Number(transfer.tokenDecimal) || 0),
      direction: isOutgoing ? 'out' : 'in',
      counterparty,
    });
  }

  return aggregate(transfers);
}

/**
 * One on-chain transaction can move the same asset the same way more than once —
 * a batch payout, or a transfer plus its gas. The database holds one row per
 * (hash, asset, direction), so those parts are summed here rather than dropped
 * by the unique index later.
 */
function aggregate(transfers: ChainTransfer[]): ChainTransfer[] {
  const merged = new Map<string, ChainTransfer>();

  for (const transfer of transfers) {
    const key = `${transfer.hash}:${transfer.asset}:${transfer.direction}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...transfer });
      continue;
    }
    existing.amount = addDecimals(existing.amount, transfer.amount);
    // Gas and value share a counterparty; keep the first non-empty one.
    existing.counterparty = existing.counterparty || transfer.counterparty;
  }

  return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function toBigInt(value: string | undefined): bigint {
  if (!value) {
    return 0n;
  }
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/** Integer-safe formatting: token amounts overflow `number` long before 18 decimals. */
export function formatUnits(value: bigint, decimals: number): string {
  if (decimals <= 0) {
    return value.toString();
  }
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, '');
  const formatted = fraction ? `${whole}.${fraction}` : whole;
  return negative ? `-${formatted}` : formatted;
}

/** Adds two decimal strings without going through binary floating point. */
export function addDecimals(a: string, b: string): string {
  const scale = Math.max(fractionLength(a), fractionLength(b));
  const sum = toScaledBigInt(a, scale) + toScaledBigInt(b, scale);
  return formatUnits(sum, scale);
}

function fractionLength(value: string): number {
  const dot = value.indexOf('.');
  return dot === -1 ? 0 : value.length - dot - 1;
}

function toScaledBigInt(value: string, scale: number): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(`${whole}${fraction.padEnd(scale, '0')}`);
}
