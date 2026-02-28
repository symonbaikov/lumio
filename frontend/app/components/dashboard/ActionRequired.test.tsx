import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import './test-setup';
import { ActionRequired } from './ActionRequired';

const baseAction = {
  href: '/test',
  count: 3,
  label: 'Transactions uncategorized',
  type: 'transactions_uncategorized',
  priority: 'info' as const,
  ctaLabel: 'Categorize',
  periodLabel: 'Last 30d',
};

describe('ActionRequired', () => {
  it('shows empty state when no actions', () => {
    render(<ActionRequired actions={[]} title="Action required" emptyLabel="All clear" />);
    expect(screen.getByText('All clear')).toBeInTheDocument();
  });

  it('renders actions with CTA and priority badge', () => {
    render(
      <ActionRequired actions={[baseAction]} title="Action required" emptyLabel="All clear" />,
    );

    expect(screen.getByText('Transactions uncategorized')).toBeInTheDocument();
    expect(screen.getByText('Categorize')).toBeInTheDocument();
    expect(screen.getByText('info')).toBeInTheDocument();
  });
});
