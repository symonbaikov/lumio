import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CustomTablePageColumn } from '../utils/tableTypes';
import { ColumnsVisibilityPanel } from './ColumnsVisibilityPanel';

function buildColumn(key: string, title: string): CustomTablePageColumn {
  return {
    id: key,
    key,
    title,
    type: 'text',
    position: 1,
    config: null,
    isRequired: false,
    isUnique: false,
  };
}

const columns = [buildColumn('col_a', 'Client'), buildColumn('col_b', 'Amount')];

function renderPanel(toggleColumnHidden: () => void) {
  return render(
    <ColumnsVisibilityPanel
      t={{}}
      columnOrder={columns.map(c => c.key)}
      orderedColumns={columns}
      hiddenColumnKeys={[]}
      isColumnsDefault
      toggleColumnHidden={toggleColumnHidden}
      resetColumns={vi.fn()}
    />,
  );
}

describe('ColumnsVisibilityPanel', () => {
  // Регрессия: строка и чекбокс оба вызывали toggleColumnHidden, клик по галочке
  // срабатывал дважды и колонка никогда не пряталась.
  it('toggles a column exactly once when the checkbox itself is clicked', () => {
    const toggleColumnHidden = vi.fn();
    renderPanel(toggleColumnHidden);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(toggleColumnHidden).toHaveBeenCalledTimes(1);
    expect(toggleColumnHidden).toHaveBeenCalledWith('col_b');
  });

  it('toggles a column once when the row label is clicked', () => {
    const toggleColumnHidden = vi.fn();
    renderPanel(toggleColumnHidden);

    fireEvent.click(screen.getByText('Amount'));

    expect(toggleColumnHidden).toHaveBeenCalledTimes(1);
    expect(toggleColumnHidden).toHaveBeenCalledWith('col_b');
  });
});
