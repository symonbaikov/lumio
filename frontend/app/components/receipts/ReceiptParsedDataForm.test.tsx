import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ReceiptParsedDataForm } from './ReceiptParsedDataForm';
import type { EditableReceiptParsedData } from './receipt-types';

type CustomDatePickerMockProps = {
  value?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  containerTestId?: string;
};

vi.mock('@/app/i18n', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('@/app/components/CustomDatePicker', () => ({
  default: ({ value, onChange, label, containerTestId }: CustomDatePickerMockProps) => (
    <div data-testid={containerTestId ?? 'mock-custom-date-picker'}>
      <span>{label}</span>
      <button type="button" aria-label="HeroUI Date" onClick={() => onChange?.('2024-07-29')}>
        {value || 'Pick date'}
      </button>
    </div>
  ),
}));

const baseValue: EditableReceiptParsedData = {
  vendor: 'Magnum',
  amount: 15420,
  currency: 'KZT',
  date: '2014-07-29',
  tax: '',
  paymentMethod: '',
  transactionType: 'expense',
  categoryId: '',
  lineItems: [],
};

describe('ReceiptParsedDataForm', () => {
  it('uses the HeroUI date picker instead of a native date input', () => {
    render(<ReceiptParsedDataForm value={baseValue} categories={[]} onChange={vi.fn()} />);

    expect(screen.queryByLabelText('Date')).toBeFalsy();
    expect(screen.queryByDisplayValue('2014-07-29')).toBeFalsy();
    expect(screen.getByTestId('receipt-date-picker')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'HeroUI Date' })).toBeTruthy();
  });

  it('updates the receipt date when the HeroUI picker changes', () => {
    const onChange = vi.fn();

    render(<ReceiptParsedDataForm value={baseValue} categories={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'HeroUI Date' }));

    expect(onChange).toHaveBeenCalledWith({
      ...baseValue,
      date: '2024-07-29',
    });
  });

  it('localizes the category option name in the selected locale', () => {
    render(
      <ReceiptParsedDataForm
        value={baseValue}
        categories={[
          {
            id: 'meals',
            name: 'Питание и представительские расходы',
            isEnabled: true,
            isSystem: true,
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    const option = screen.getByRole('option', { name: 'Meals and entertainment' });
    expect(option).toBeTruthy();
    expect((option as HTMLOptionElement).value).toBe('meals');
  });

  it('renders line items and adds a new empty line on request', () => {
    const onChange = vi.fn();

    render(
      <ReceiptParsedDataForm
        value={{
          ...baseValue,
          lineItems: [{ id: 'line-1', description: 'Milk', amount: 12.5 }],
        }}
        categories={[]}
        onChange={onChange}
      />,
    );

    expect(screen.getByDisplayValue('Milk')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lineItems: expect.arrayContaining([expect.objectContaining({ description: '' })]),
      }),
    );
  });
});
