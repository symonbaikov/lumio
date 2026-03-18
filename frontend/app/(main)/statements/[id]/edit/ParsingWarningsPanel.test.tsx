// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParsingWarningsPanel, formatDroppedSample } from './ParsingWarningsPanel';

vi.mock('@heroui/tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => (
    <div data-tooltip-content={String(content)}>{children}</div>
  ),
}));

describe('ParsingWarningsPanel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows each parsing warning as an actionable visible list item', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={[
            'Row 14: amount could not be matched confidently',
            'Row 27: ambiguous payment purpose detected',
          ]}
          title="Parsing warnings"
          helperText="Review the flagged rows before submitting this statement."
        />,
      );
    });

    expect(container.textContent).toContain('Parsing warnings');
    expect(container.textContent).toContain(
      'Review the flagged rows before submitting this statement.',
    );
    expect(container.textContent).toContain('Row 14: amount could not be matched confidently');
    expect(container.textContent).toContain('Row 27: ambiguous payment purpose detected');
  });

  it('renders nothing when there are no warnings', async () => {
    await act(async () => {
      root.render(<ParsingWarningsPanel warnings={[]} />);
    });

    expect(container.textContent).toBe('');
  });

  it('formats structured dropped samples into readable text', () => {
    expect(
      formatDroppedSample({
        reason: 'tx#14: skipped (invalid date)',
        transaction: {
          counterpartyName: 'Kaspi Pay',
          paymentPurpose: 'Payment for services',
        },
      }),
    ).toBe('tx#14: skipped (invalid date): Kaspi Pay - Payment for services');
  });

  it('enables convert action only after required dropped-row fields are filled', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['tx#207: skipped (no debit/credit amount)']}
          droppedSamples={[
            {
              reason: 'tx#207: skipped (no debit/credit amount)',
              transaction: {
                transactionDate: '2026-03-17',
                counterpartyName: 'Kaspi Pay',
                paymentPurpose: 'Service payment',
              },
            },
          ]}
        />,
      );
    });

    const rowButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('tx#207: skipped (no debit/credit amount)'),
    ) as HTMLButtonElement | undefined;

    expect(rowButton).toBeTruthy();

    await act(async () => {
      rowButton?.click();
    });

    const convertButton = Array.from(document.body.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Convert to transaction'),
    ) as HTMLButtonElement | undefined;

    expect(convertButton).toBeTruthy();
    expect(convertButton?.disabled).toBe(true);
  });

  it('opens dropped-row editor in a modal after clicking the row', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['tx#207: skipped (no debit/credit amount)']}
          droppedSamples={[
            {
              reason: 'tx#207: skipped (no debit/credit amount)',
              transaction: {
                transactionDate: '2026-03-17',
                counterpartyName: 'Kaspi Pay',
                paymentPurpose: 'Service payment',
              },
            },
          ]}
        />,
      );
    });

    const rowButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('tx#207: skipped (no debit/credit amount)'),
    ) as HTMLButtonElement | undefined;

    expect(rowButton).toBeTruthy();

    await act(async () => {
      rowButton?.click();
    });

    expect(document.body.textContent).toContain('Convert dropped row');
    const counterpartyInput = Array.from(document.body.querySelectorAll('input')).find(input =>
      (input.getAttribute('name') || '').includes('counterpartyName'),
    ) as HTMLInputElement | undefined;
    const purposeInput = Array.from(document.body.querySelectorAll('input')).find(input =>
      (input.getAttribute('name') || '').includes('paymentPurpose'),
    ) as HTMLInputElement | undefined;

    expect(counterpartyInput?.value).toBe('Kaspi Pay');
    expect(purposeInput?.value).toBe('Service payment');
  });

  it('opens editor for negative amount warnings too', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['tx#189: skipped (negative amount)']}
          droppedSamples={[
            {
              reason: 'tx#189: skipped (negative amount)',
              transaction: {
                transactionDate: '2026-03-17',
                counterpartyName: 'Kaspi Pay',
                paymentPurpose: 'Service payment',
                debit: -1500,
              },
            },
          ]}
          fixTooltipLabel="Исправить"
        />,
      );
    });

    const rowButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('tx#189: skipped (negative amount)'),
    ) as HTMLButtonElement | undefined;

    expect(rowButton).toBeTruthy();

    await act(async () => {
      rowButton?.click();
    });

    expect(document.body.textContent).toContain('Convert dropped row');
  });

  it('matches editable warning rows by transaction number, not only full reason text', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['tx#209: skipped (negative amount) [review]']}
          droppedSamples={[
            {
              reason: 'tx#209: skipped (negative amount)',
              transaction: {
                transactionDate: '2026-03-17',
                counterpartyName: 'Kaspi Pay',
                paymentPurpose: 'Service payment',
                debit: -1500,
              },
            },
          ]}
          fixTooltipLabel="Исправить"
        />,
      );
    });

    const rowButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('tx#209: skipped (negative amount) [review]'),
    ) as HTMLButtonElement | undefined;

    expect(rowButton).toBeTruthy();

    await act(async () => {
      rowButton?.click();
    });

    expect(document.body.textContent).toContain('Convert dropped row');
  });

  it('opens editor for repairable warning rows even when dropped sample payload is missing', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={[
            'tx#243: skipped (negative amount)',
            'tx#245: skipped (no debit/credit amount)',
          ]}
          fixTooltipLabel="Исправить"
        />,
      );
    });

    const rowButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('tx#245: skipped (no debit/credit amount)'),
    ) as HTMLButtonElement | undefined;

    expect(rowButton).toBeTruthy();

    await act(async () => {
      rowButton?.click();
    });

    expect(document.body.textContent).toContain('Convert dropped row');
  });

  it('renders balance mismatch warning as an actionable item', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={[
            'Balance mismatch: expected 1000.00 got 800.00 (diff 200.00)',
          ]}
          fixTooltipLabel="Исправить"
        />,
      );
    });

    const rowButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Balance mismatch: expected 1000.00 got 800.00 (diff 200.00)'),
    ) as HTMLButtonElement | undefined;

    expect(rowButton).toBeTruthy();
  });

  it('shows balance-specific tooltip for balance mismatch warnings', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['Balance mismatch: expected 1000.00 got 800.00 (diff 200.00)']}
          resolveBalanceTooltipLabel="Проверить баланс"
        />,
      );
    });

    const tooltipHost = Array.from(container.querySelectorAll('[data-tooltip-content]')).find(node =>
      node.textContent?.includes('Balance mismatch: expected 1000.00 got 800.00 (diff 200.00)'),
    ) as HTMLElement | undefined;

    expect(tooltipHost).toBeTruthy();
    expect(tooltipHost?.getAttribute('data-tooltip-content')).toBe('Проверить баланс');
  });

  it('shows localized fix tooltip on hoverable dropped warning rows', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['tx#207: skipped (no debit/credit amount)']}
          droppedSamples={[
            {
              reason: 'tx#207: skipped (no debit/credit amount)',
              transaction: {
                transactionDate: '2026-03-17',
                counterpartyName: 'Kaspi Pay',
                paymentPurpose: 'Service payment',
              },
            },
          ]}
          fixTooltipLabel="Исправить"
        />,
      );
    });

    const tooltipHost = Array.from(container.querySelectorAll('[data-tooltip-content]')).find(node =>
      node.textContent?.includes('tx#207: skipped (no debit/credit amount)'),
    ) as HTMLElement | undefined;

    expect(tooltipHost).toBeTruthy();
    expect(tooltipHost?.getAttribute('data-tooltip-content')).toBe('Исправить');
  });

  it('does not render a separate dropped-rows list under warnings', async () => {
    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['tx#207: skipped (no debit/credit amount)']}
          droppedSamples={[
            {
              reason: 'tx#207: skipped (no debit/credit amount)',
              transaction: {
                transactionDate: '2026-03-17',
                counterpartyName: 'Kaspi Pay',
                paymentPurpose: 'Service payment',
              },
            },
          ]}
          fixTooltipLabel="Исправить"
        />,
      );
    });

    const text = container.textContent || '';
    const matches = text.match(/tx#207: skipped \(no debit\/credit amount\)/g) || [];

    expect(matches).toHaveLength(1);
  });

  it('converts a dropped row after a valid amount is entered', async () => {
    const onConvertDroppedSample = vi.fn();

    await act(async () => {
      root.render(
        <ParsingWarningsPanel
          warnings={['tx#207: skipped (no debit/credit amount)']}
          droppedSamples={[
            {
              reason: 'tx#207: skipped (no debit/credit amount)',
              transaction: {
                transactionDate: '2026-03-17',
                counterpartyName: 'Kaspi Pay',
                paymentPurpose: 'Service payment',
              },
            },
          ]}
          onConvertDroppedSample={onConvertDroppedSample}
        />,
      );
    });

    const rowButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('tx#207: skipped (no debit/credit amount)'),
    ) as HTMLButtonElement | undefined;

    expect(rowButton).toBeTruthy();

    await act(async () => {
      rowButton?.click();
    });

    const amountInput = Array.from(document.body.querySelectorAll('input')).find(input =>
      (input.getAttribute('name') || '').includes('debit'),
    ) as HTMLInputElement | undefined;

    expect(amountInput).toBeTruthy();
    if (!amountInput) {
      throw new Error('Expected debit input to exist');
    }

    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(amountInput, '1250');
      amountInput.dispatchEvent(new Event('input', { bubbles: true }));
      amountInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const convertButton = Array.from(document.body.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Convert to transaction'),
    ) as HTMLButtonElement | undefined;

    expect(convertButton?.disabled).toBe(false);

    await act(async () => {
      convertButton?.click();
    });

    expect(onConvertDroppedSample).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'tx#207: skipped (no debit/credit amount)',
        transaction: expect.objectContaining({
          transactionDate: '2026-03-17',
          debit: 1250,
          counterpartyName: 'Kaspi Pay',
          paymentPurpose: 'Service payment',
        }),
      }),
      0,
    );
  });
});
