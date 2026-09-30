// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { addressFamily, type CryptoNetwork } from '../hooks/useCrypto';
import { ConnectWalletDrawer } from './ConnectWalletDrawer';

vi.mock('@/app/components/ui/drawer-shell', () => ({
  DrawerShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const NETWORKS: CryptoNetwork[] = [
  { chainId: 1, name: 'Ethereum', family: 'evm', nativeAsset: 'ETH' },
  { chainId: 8453, name: 'Base', family: 'evm', nativeAsset: 'ETH' },
  { chainId: 137, name: 'Polygon', family: 'evm', nativeAsset: 'POL' },
  { chainId: 2_000_000_000, name: 'Bitcoin', family: 'bitcoin', nativeAsset: 'BTC' },
];

const LABELS = {
  title: 'Connect wallet',
  useMetaMask: 'Connect with MetaMask',
  manualHint: 'or paste',
  addressLabel: 'Address',
  nameLabel: 'Name',
  invalidAddress: 'Invalid address',
  networksHint: 'hint',
  networksLabel: 'Networks',
  networkDetected: 'Network:',
  noNetworkSelected: 'Tick at least one network',
  noWallet: 'No wallet',
  readOnly: 'Read-only',
  connect: 'Connect',
  cancel: 'Cancel',
};

function renderDrawer() {
  const onSubmit = vi.fn(async () => true);
  render(
    <ConnectWalletDrawer
      open
      saving={false}
      serverError={null}
      labels={LABELS}
      networks={NETWORKS}
      onClose={() => undefined}
      onSubmit={onSubmit}
    />,
  );
  const type = (value: string) =>
    fireEvent.change(screen.getByLabelText('Address'), { target: { value } });
  const connect = () => fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
  return { onSubmit, type, connect };
}

describe('ConnectWalletDrawer', () => {
  it('offers every EVM network for a 0x address and sends the ticked ones', async () => {
    const { onSubmit, type, connect } = renderDrawer();
    type('0x899cd926a9028afe9056e76cc01f32ee859e7a65');

    fireEvent.click(screen.getByLabelText('Base'));
    connect();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        '0x899cd926a9028afe9056e76cc01f32ee859e7a65',
        '',
        [1, 137],
      ),
    );
    expect(screen.queryByLabelText('Bitcoin')).toBeNull();
  });

  it('refuses a 0x address with every network unticked', () => {
    const { onSubmit, type, connect } = renderDrawer();
    type('0x899cd926a9028afe9056e76cc01f32ee859e7a65');
    for (const name of ['Ethereum', 'Base', 'Polygon']) {
      fireEvent.click(screen.getByLabelText(name));
    }

    connect();

    expect(screen.getByText('Tick at least one network')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the detected network for a Bitcoin address and sends no chain list', async () => {
    const { onSubmit, type, connect } = renderDrawer();
    type('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');

    expect(screen.getByText('Bitcoin')).toBeTruthy();
    expect(screen.queryByLabelText('Ethereum')).toBeNull();
    connect();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        '',
        undefined,
      ),
    );
  });
});

describe('addressFamily', () => {
  it.each([
    ['0x899cd926a9028afe9056e76cc01f32ee859e7a65', 'evm'],
    ['TLLU15qbiSEqv2y3DLfbHTHS5TVdjQ7hoJ', 'tron'],
    ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'bitcoin'],
    ['3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'bitcoin'],
    ['vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg', 'solana'],
    ['not an address', null],
  ])('reads %s as %s', (address, family) => {
    expect(addressFamily(address)).toBe(family);
  });
});
