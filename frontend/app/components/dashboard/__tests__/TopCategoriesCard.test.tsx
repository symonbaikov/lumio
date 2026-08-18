// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../test-setup';
import { TopCategoriesCard } from '../TopCategoriesCard';

// Mirrors react-intlayer's renderIntlayerNode: a Proxy over a rendered
// Fragment whose `.value` is intercepted to return the plain string, so the
// mock is usable both as a JSX child and via `.value` string access.
const value = (v: string) =>
  // biome-ignore lint/complexity/noUselessFragments: Proxy needs an object target — a bare string can't be proxied
  new Proxy(<>{v}</>, {
    get(target, prop, receiver) {
      if (prop === 'value') return v;
      return Reflect.get(target, prop, receiver);
    },
  });

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    noCategoryData: value('No category data'),
    uncategorized: value('Uncategorized'),
    other: value('Other'),
  }),
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-echarts" />,
}));

describe('TopCategoriesCard', () => {
  it('shows the empty state when there are no categories', () => {
    render(<TopCategoriesCard categories={[]} formatAmount={value => String(value)} />);

    expect(screen.getByText('No category data')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-echarts')).not.toBeInTheDocument();
  });

  it('renders the localized fallback label for a null-name (uncategorized) row', () => {
    render(
      <TopCategoriesCard
        categories={[
          { id: null, name: null, color: '#898781', icon: null, amount: 500, percent: 100, count: 2 },
        ]}
        formatAmount={v => `$${v}`}
      />,
    );

    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('renders the localized "Other" label for the rollup row regardless of its raw name', () => {
    render(
      <TopCategoriesCard
        categories={[
          {
            id: null,
            name: null,
            isOther: true,
            color: '#898781',
            icon: null,
            amount: 250,
            percent: 12.5,
            count: 3,
          },
        ]}
        formatAmount={v => `$${v}`}
      />,
    );

    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('renders a real category by its own name, not the uncategorized fallback', () => {
    render(
      <TopCategoriesCard
        categories={[
          { id: 'cat-1', name: 'Groceries', color: '#0584C7', icon: null, amount: 1200, percent: 40, count: 5 },
        ]}
        formatAmount={v => `$${v}`}
      />,
    );

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.queryByText('Uncategorized')).not.toBeInTheDocument();
  });
});
