// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

vi.mock('next/image', () => ({
  default: ({ src, className }: { src: string; className?: string }) => (
    <img src={src} alt="" className={className} data-testid="illustration" />
  ),
}));

describe('EmptyState', () => {
  it('renders the illustration, texts and action', () => {
    render(
      <EmptyState
        illustration="reports"
        title="Nothing yet"
        description="Add data to see a chart"
        action={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByTestId('illustration').getAttribute('src')).toBe(
      '/images/empty-states/reports.svg',
    );
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeInTheDocument();
    expect(screen.getByText('Add data to see a chart')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('applies the compact modifier and a smaller illustration size', () => {
    const { container } = render(<EmptyState illustration="no-data" size="sm" compact />);
    expect(container.firstElementChild?.className).toContain('lumio-empty-state--compact');
    expect(screen.getByTestId('illustration').className).toContain('lumio-empty-illustration--sm');
  });
});
