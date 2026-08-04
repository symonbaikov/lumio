// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateExpenseDrawer from './CreateExpenseDrawer';

const isMobileMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => isMobileMock(),
}));

vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: () => <input aria-label="Date" readOnly />,
}));

describe('CreateExpenseDrawer mobile uploads', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    isMobileMock.mockReturnValue(false);
  });

  it('uses camera-friendly file input in scan mode', async () => {
    const container = document.createElement('div');
    document.body.innerHTML = '';
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="scan"
          categories={[]}
          taxRates={[]}
          onClose={() => undefined}
          onSubmitScan={async () => undefined}
          onSubmitManual={async () => undefined}
        />,
      );
    });

    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(uploadInput).toBeTruthy();
    expect(uploadInput?.getAttribute('accept')).toContain('image/*');
    expect(uploadInput?.getAttribute('accept')).not.toContain('.csv');
    expect(uploadInput?.getAttribute('accept')).not.toContain('.xlsx');
    expect(uploadInput?.getAttribute('accept')).not.toContain('.xls');
    expect(uploadInput?.getAttribute('capture')).toBe('environment');

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps auto-categorization enabled for scan uploads', async () => {
    const container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSubmitScan = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="scan"
          categories={[]}
          taxRates={[]}
          onClose={() => undefined}
          onSubmitScan={onSubmitScan}
          onSubmitManual={async () => undefined}
        />,
      );
    });

    const file = new File(['dummy'], 'statement.pdf', { type: 'application/pdf' });
    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(uploadInput, { target: { files: [file] } });
    });

    const submitButton = screen.getByRole('button', { name: /upload receipt/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(onSubmitScan).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [file],
        requireManualCategorySelection: false,
      }),
    );

    await act(async () => {
      root.unmount();
    });
  });

  it('uses dark-safe drawer surfaces for scan and manual modes', async () => {
    const container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="scan"
          categories={[]}
          taxRates={[]}
          onClose={() => undefined}
          onSubmitScan={async () => undefined}
          onSubmitManual={async () => undefined}
        />,
      );
    });

    const drawerSurface = document.querySelector('.lumio-expense-drawer');
    const lightSurface = Array.from(document.querySelectorAll('[class]')).find(
      node =>
        typeof node.className === 'string' &&
        (node.className.includes('bg-white') || node.className.includes('bg-[#ebe8e2]')),
    );

    expect(drawerSurface).toBeTruthy();
    expect(lightSurface).toBeUndefined();

    await act(async () => {
      root.unmount();
    });
  });

  it('shows separate camera and gallery actions on mobile in scan mode', async () => {
    isMobileMock.mockReturnValue(true);

    const container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="scan"
          categories={[]}
          taxRates={[]}
          onClose={() => undefined}
          onSubmitScan={async () => undefined}
          onSubmitManual={async () => undefined}
        />,
      );
    });

    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose from gallery/i })).toBeInTheDocument();
    expect(screen.queryByText('Upload receipts')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose files')).not.toBeInTheDocument();

    const fileInputs = Array.from(
      document.querySelectorAll('input[type="file"]'),
    ) as HTMLInputElement[];
    expect(fileInputs).toHaveLength(2);
    expect(fileInputs[0]?.getAttribute('capture')).toBe('environment');
    expect(fileInputs[0]?.getAttribute('accept')).toBe('image/*');
    expect(fileInputs[1]?.getAttribute('accept')).toContain('image/*');

    await act(async () => {
      root.unmount();
    });
  });

  it('closes immediately on submit, letting the scan upload continue in the background', async () => {
    let finishUpload: (() => void) | undefined;
    const onSubmitScan = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finishUpload = resolve;
        }),
    );
    const onClose = vi.fn();
    const container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="scan"
          categories={[]}
          taxRates={[]}
          onClose={onClose}
          onSubmitScan={onSubmitScan}
          onSubmitManual={async () => undefined}
        />,
      );
    });

    const files = [
      new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
    ];
    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(uploadInput, { target: { files } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /upload receipt/i }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(onSubmitScan).toHaveBeenCalledWith({
      files,
      allowDuplicates: true,
      requireManualCategorySelection: false,
    });

    await act(async () => {
      finishUpload?.();
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('creates and selects a tax rate from the manual tax drawer', async () => {
    const container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCreateTaxRate = vi.fn().mockResolvedValue({
      id: 'tax-vat-12',
      name: 'VAT 12%',
      rate: 12,
      isDefault: false,
      isEnabled: true,
    });

    await act(async () => {
      root.render(
        <CreateExpenseDrawer
          open
          initialMode="manual"
          categories={[]}
          taxRates={[]}
          onClose={() => undefined}
          onSubmitScan={async () => undefined}
          onSubmitManual={async () => undefined}
          onCreateTaxRate={onCreateTaxRate}
        />,
      );
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '20' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tax optional/i }));
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/tax rate name/i), {
        target: { value: 'VAT 12%' },
      });
      fireEvent.change(screen.getByLabelText(/tax percentage/i), { target: { value: '12' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save tax rate/i }));
    });

    await waitFor(() => {
      expect(onCreateTaxRate).toHaveBeenCalledWith({
        name: 'VAT 12%',
        rate: 12,
        isEnabled: true,
      });
    });
    expect(screen.getAllByText('VAT 12% (12%)').length).toBeGreaterThan(0);

    await act(async () => {
      root.unmount();
    });
  });
});
