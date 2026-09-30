import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CustomTableColumn, CustomTableGridRow } from '../../utils/types';
import { EditableCell } from './EditableCell';

const labels = { yes: 'Yes', no: 'No', clear: 'Clear', edit: 'Edit' };

const column = (partial: Partial<CustomTableColumn>): CustomTableColumn => ({
  id: 'c',
  key: 'c',
  title: 'Amount',
  type: 'number',
  position: 0,
  config: null,
  ...partial,
});

const row = (value: CustomTableGridRow['data'][string]): CustomTableGridRow => ({
  id: 'r1',
  rowNumber: 1,
  data: { c: value },
});

describe('EditableCell', () => {
  it('saves a parsed number on Enter and reverts on Escape', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableCell
        column={column({ type: 'number' })}
        row={row(10)}
        fallbackCurrency="KZT"
        missingRequired={false}
        onUpdate={onUpdate}
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit: Amount' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '1 234,5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdate).toHaveBeenCalledWith('r1', 'c', 1234.5);
  });

  it('toggles booleans without entering edit mode', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableCell
        column={column({ type: 'boolean', title: 'Paid' })}
        row={row(false)}
        fallbackCurrency="KZT"
        missingRequired={false}
        onUpdate={onUpdate}
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Paid' }));
    expect(onUpdate).toHaveBeenCalledWith('r1', 'c', true);
  });

  it('renders formulas read-only with the column format', () => {
    render(
      <EditableCell
        column={column({ type: 'formula', config: { precision: 1, format: 'percent' } })}
        row={row(12.5)}
        fallbackCurrency="KZT"
        missingRequired={false}
        onUpdate={vi.fn()}
        labels={labels}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/12[.,]5/)).toBeInTheDocument();
  });
});
