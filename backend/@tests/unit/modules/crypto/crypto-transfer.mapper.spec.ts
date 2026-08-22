import {
  addDecimals,
  type EtherscanTokenTx,
  type EtherscanTx,
  formatUnits,
  mapChainTransfers,
} from '../../../../src/modules/crypto/crypto-transfer.mapper';

const ME = '0x1111111111111111111111111111111111111111';
const OTHER_OWN = '0x2222222222222222222222222222222222222222';
const STRANGER = '0x3333333333333333333333333333333333333333';

function tx(overrides: Partial<EtherscanTx> = {}): EtherscanTx {
  return {
    hash: '0xhash',
    timeStamp: '1750000000',
    from: STRANGER,
    to: ME,
    value: '0',
    gasUsed: '0',
    gasPrice: '0',
    ...overrides,
  };
}

function tokenTx(overrides: Partial<EtherscanTokenTx> = {}): EtherscanTokenTx {
  return {
    hash: '0xtoken',
    timeStamp: '1750000000',
    from: STRANGER,
    to: ME,
    value: '0',
    tokenSymbol: 'USDC',
    tokenDecimal: '6',
    ...overrides,
  };
}

function map(overrides: {
  transactions?: EtherscanTx[];
  tokenTransfers?: EtherscanTokenTx[];
  ownAddresses?: string[];
}) {
  return mapChainTransfers({
    address: ME,
    nativeAsset: 'ETH',
    ownAddresses: overrides.ownAddresses ?? [ME],
    transactions: overrides.transactions ?? [],
    tokenTransfers: overrides.tokenTransfers ?? [],
  });
}

describe('mapChainTransfers', () => {
  it('books an incoming native transfer as income', () => {
    const [transfer] = map({ transactions: [tx({ value: '1500000000000000000' })] });

    expect(transfer).toMatchObject({
      asset: 'ETH',
      amount: '1.5',
      direction: 'in',
      counterparty: STRANGER,
    });
  });

  it('books an outgoing native transfer as an expense and gas separately', () => {
    const transfers = map({
      transactions: [
        tx({
          from: ME,
          to: STRANGER,
          value: '1000000000000000000',
          gasUsed: '21000',
          gasPrice: '1000000000',
        }),
      ],
    });

    // Value and gas share a hash, asset and direction, so they merge into one row.
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({ direction: 'out', amount: '1.000021' });
  });

  it('drops a transfer between two wallets the workspace owns', () => {
    const transfers = map({
      transactions: [tx({ from: ME, to: OTHER_OWN, value: '1000000000000000000' })],
      ownAddresses: [ME, OTHER_OWN],
    });

    expect(transfers).toEqual([]);
  });

  it('still books the gas burned by an internal transfer', () => {
    const transfers = map({
      transactions: [
        tx({
          from: ME,
          to: OTHER_OWN,
          value: '1000000000000000000',
          gasUsed: '21000',
          gasPrice: '1000000000',
        }),
      ],
      ownAddresses: [ME, OTHER_OWN],
    });

    expect(transfers).toEqual([
      expect.objectContaining({ direction: 'out', amount: '0.000021', asset: 'ETH' }),
    ]);
  });

  it('books only gas for a reverted transaction', () => {
    const transfers = map({
      transactions: [
        tx({
          from: ME,
          to: STRANGER,
          value: '1000000000000000000',
          gasUsed: '21000',
          gasPrice: '1000000000',
          isError: '1',
        }),
      ],
    });

    expect(transfers).toEqual([expect.objectContaining({ amount: '0.000021', direction: 'out' })]);
  });

  it('honours each token’s own decimal count', () => {
    const [transfer] = map({ tokenTransfers: [tokenTx({ value: '2500000' })] });

    expect(transfer).toMatchObject({ asset: 'USDC', amount: '2.5', direction: 'in' });
  });

  it('sums several transfers of one asset inside a single transaction', () => {
    const transfers = map({
      tokenTransfers: [tokenTx({ value: '1000000' }), tokenTx({ value: '500000' })],
    });

    expect(transfers).toEqual([expect.objectContaining({ amount: '1.5' })]);
  });

  it('keeps the two legs of a transaction that both sends and receives apart', () => {
    const transfers = map({
      transactions: [tx({ from: ME, to: STRANGER, value: '1000000000000000000' })],
      tokenTransfers: [tokenTx({ value: '3000000' })],
    });

    expect(transfers).toHaveLength(2);
    expect(transfers.map(transfer => transfer.direction).sort()).toEqual(['in', 'out']);
  });

  it('ignores zero-value rows such as bare contract calls', () => {
    expect(map({ transactions: [tx({ value: '0' })] })).toEqual([]);
  });
});

describe('formatUnits', () => {
  it.each([
    [1n, 18, '0.000000000000000001'],
    [1000000000000000000n, 18, '1'],
    [1500000n, 6, '1.5'],
    [0n, 18, '0'],
    [42n, 0, '42'],
    [-500000n, 6, '-0.5'],
  ])('formats %s with %s decimals as %s', (value, decimals, expected) => {
    expect(formatUnits(value, decimals)).toBe(expected);
  });

  it('does not lose precision on amounts beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatUnits(123456789012345678901234567890n, 18)).toBe('123456789012.34567890123456789');
  });
});

describe('addDecimals', () => {
  it('adds values with different scales', () => {
    expect(addDecimals('1.5', '0.000021')).toBe('1.500021');
  });

  it('subtracts when the second value is negative', () => {
    expect(addDecimals('2', '-0.5')).toBe('1.5');
  });

  it('avoids the binary floating point error of 0.1 + 0.2', () => {
    expect(addDecimals('0.1', '0.2')).toBe('0.3');
  });
});
