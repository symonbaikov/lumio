import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForecastData } from '../hooks/useForecast';
import { ForecastContent } from './ForecastContent';

const hookMock = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  toggleExcluded: vi.fn(),
  setFactor: vi.fn(),
  setHorizon: vi.fn(),
}));

vi.mock('../hooks/useForecast', async importOriginal => ({
  ...(await importOriginal<typeof import('../hooks/useForecast')>()),
  useForecast: () => hookMock.state,
}));
vi.mock('./ForecastChart', () => ({ ForecastChart: () => <div data-testid="forecast-chart" /> }));

const data: ForecastData = {
  currency: 'USD',
  profile: 'home',
  horizonDays: 90,
  openingBalance: 1000,
  closingBalance: 700,
  totalInflow: 2000,
  totalOutflow: 1800,
  totalEveryday: 500,
  days: [{ date: '2026-10-01', inflow: 0, outflow: 0, everyday: 5, balance: 995 }],
  events: [
    { date: '2026-10-05', label: 'Landlord', amount: -500, kind: 'payable', sourceId: 'p1' },
    { date: '2026-10-10', label: 'ACME', amount: 2000, kind: 'income', sourceId: 'income:0' },
  ],
  lowestBalance: 480,
  lowestBalanceDate: '2026-10-09',
  shortfallDate: null,
  safeToSpend: { amount: 480, untilDate: '2026-10-09', nextIncomeDate: '2026-10-10' },
  runwayMonths: null,
  everydayMonthly: 300,
  monthlyIncome: 2000,
  monthlyExpense: 1700,
  monthsObserved: 3,
  unscheduledCommitted: 0,
};

const setState = (overrides: Partial<ForecastData> = {}, extra: Record<string, unknown> = {}) => {
  hookMock.state = {
    data: { ...data, ...overrides },
    isPending: false,
    isFetching: false,
    error: null,
    horizon: 90,
    setHorizon: hookMock.setHorizon,
    scenario: { incomeFactor: 1, expenseFactor: 1, exclude: [] },
    toggleExcluded: hookMock.toggleExcluded,
    setFactor: hookMock.setFactor,
    ...extra,
  };
};

describe('ForecastContent', () => {
  beforeEach(() => {
    hookMock.toggleExcluded.mockReset();
    hookMock.setFactor.mockReset();
  });

  it('shows safe-to-spend until payday at home and lists what is ahead with a checkbox each', () => {
    setState();
    render(<ForecastContent />);

    expect(screen.getByText('Safe to spend')).toBeInTheDocument();
    expect(screen.getByText(/until payday/)).toBeInTheDocument();
    expect(screen.getByText('None expected in this horizon')).toBeInTheDocument();
    expect(screen.getByText('Landlord')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Landlord' }));
    expect(hookMock.toggleExcluded).toHaveBeenCalledWith('p1');
  });

  it('shows the runway for a business and names the shortfall day', () => {
    setState({ profile: 'business', runwayMonths: 2.5, shortfallDate: '2026-11-20' });
    render(<ForecastContent />);

    expect(screen.getByText('Runway')).toBeInTheDocument();
    expect(screen.getByText('2.5 months at the current burn')).toBeInTheDocument();
    expect(screen.getByText(/balance goes negative on/)).toBeInTheDocument();
    expect(screen.queryByText('Safe to spend')).not.toBeInTheDocument();
  });

  it('offers an empty state when there is nothing to project', () => {
    setState({ events: [], everydayMonthly: 0, openingBalance: 0 });
    render(<ForecastContent />);

    expect(screen.getByText(/Nothing to forecast yet/)).toBeInTheDocument();
  });
});
