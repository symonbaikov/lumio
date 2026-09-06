// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { KpiCard } from '../KpiCard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('KpiCard', () => {
  it('applies the tone modifier to the value and shows the caption', () => {
    render(<KpiCard label="Spent" value="$3,072" tone="negative" caption="excludes transfers" />);
    expect(screen.getByText('$3,072').className).toContain('lumio-dashboard__stat-value--negative');
    expect(screen.getByText('excludes transfers')).toBeInTheDocument();
  });

  it('renders as a link when href is given', () => {
    render(<KpiCard label="Uncategorized" value={4} href="/statements/submit" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/statements/submit');
    expect(link.className).toContain('lumio-dashboard__stat--link');
  });

  it('renders a sparkline only with two or more points', () => {
    const { container, rerender } = render(
      <KpiCard label="Income" value="1" spark={{ points: [1] }} />,
    );
    expect(container.querySelector('svg')).toBeNull();
    rerender(<KpiCard label="Income" value="1" spark={{ points: [1, 2, 3] }} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
