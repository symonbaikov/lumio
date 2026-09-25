import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { COLOR_PRESETS } from '../../utils/colorPalette';
import { ColumnHeaderMenu, type ColumnMenuLabels } from './ColumnHeaderMenu';

vi.mock('@/app/hooks/useIsMobile', () => ({ useIsMobile: () => false }));

const labels: ColumnMenuLabels = {
  menu: 'Column menu',
  rename: 'Rename',
  edit: 'Edit column…',
  headerColor: 'Header colour',
  columnColor: 'Column colour',
  custom: 'Custom…',
  clear: 'Clear',
  pin: 'Pin',
  unpin: 'Unpin',
  hide: 'Hide',
  sortAsc: 'Sort ascending',
  sortDesc: 'Sort descending',
  sortClear: 'Clear sorting',
  delete: 'Delete column',
};

function renderMenu(overrides: Partial<React.ComponentProps<typeof ColumnHeaderMenu>> = {}) {
  const handlers = {
    onRename: vi.fn(),
    onEdit: vi.fn(),
    onSetStyle: vi.fn(),
    onTogglePin: vi.fn(),
    onHide: vi.fn(),
    onSort: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<ColumnHeaderMenu labels={labels} isPinned={false} {...handlers} {...overrides} />);
  fireEvent.click(screen.getByRole('button', { name: 'Column menu' }));
  return handlers;
}

describe('ColumnHeaderMenu', () => {
  it('routes every item to its callback', () => {
    const h = renderMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sort descending' }));
    expect(h.onSort).toHaveBeenCalledWith('desc');
  });

  it('opens the menu in a portal outside the header', () => {
    renderMenu();

    const item = screen.getByRole('menuitem', { name: 'Rename' });
    expect(item.closest('th')).toBeNull();
    expect(document.body.contains(item)).toBe(true);
  });

  it('sets and clears the column colour without closing the menu', () => {
    const h = renderMenu();

    fireEvent.click(screen.getByRole('button', { name: `Column colour: ${COLOR_PRESETS[0].id}` }));
    expect(h.onSetStyle).toHaveBeenCalledWith({
      cell: { backgroundColor: COLOR_PRESETS[0].fill },
    });
    // Меню осталось открытым — можно перебирать цвета.
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Header colour: Clear' }));
    expect(h.onSetStyle).toHaveBeenCalledWith({ header: null });
  });

  it('shows Unpin for a pinned column and Pin otherwise', () => {
    const h = renderMenu({ isPinned: true });

    fireEvent.click(screen.getByRole('menuitem', { name: 'Unpin' }));
    expect(h.onTogglePin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Pin' })).toBeNull();
  });

  it('hides delete and colours when the callbacks are absent', () => {
    renderMenu({ onDelete: undefined, onSetStyle: undefined });

    expect(screen.queryByRole('menuitem', { name: 'Delete column' })).toBeNull();
    expect(screen.queryByText('Column colour')).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Hide' })).toBeTruthy();
  });
});
