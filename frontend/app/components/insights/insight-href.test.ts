import { describe, expect, it } from 'vitest';
import type { Insight } from '@/app/hooks/useInsights';
import { insightHref } from './insight-href';

const makeInsight = (overrides: Partial<Insight>): Insight => ({
  id: 'insight-1',
  type: 'trend.spending_up',
  category: 'trend',
  severity: 'warn',
  title: 'Category is rising',
  message: 'Spending is above the average',
  messageKey: null,
  messageParams: null,
  data: null,
  createdAt: '2026-09-23T00:00:00.000Z',
  ...overrides,
});

describe('insightHref', () => {
  it('sends a rising category to its row on the leaderboard, by name', () => {
    const href = insightHref(
      makeInsight({
        type: 'trend.spending_up',
        data: { categoryId: 'cat-1', categoryName: '  Marketing and Advertising ' },
      }),
    );

    expect(href).toBe(
      '/statements/top-categories?focus=category%3Amarketing%20and%20advertising',
    );
  });

  it('leaves a rising category unlinked when the name is missing', () => {
    expect(
      insightHref(makeInsight({ type: 'trend.spending_up', data: { categoryId: 'cat-1' } })),
    ).toBeNull();
    expect(insightHref(makeInsight({ type: 'trend.spending_up', data: { categoryName: '  ' } }))).toBeNull();
    expect(insightHref(makeInsight({ type: 'trend.spending_up', data: null }))).toBeNull();
  });

  it('opens the budget form on the category that has none', () => {
    expect(
      insightHref(
        makeInsight({ type: 'category.dominance', data: { categoryId: 'cat-7', amount: 780 } }),
      ),
    ).toBe('/budgets?newBudgetCategory=cat-7');
  });

  it('still reaches the budgets page when the insight carries no category', () => {
    // Several showcase insights were written by hand and have no `data` at all.
    expect(insightHref(makeInsight({ type: 'category.dominance', data: null }))).toBe('/budgets');
  });

  it('points the savings rate at the tab that actually shows it', () => {
    // The KPI lives on Overview; the Trends tab has no savings-rate widget.
    expect(insightHref(makeInsight({ type: 'trend.savings_rate' }))).toBe(
      '/dashboard?tab=overview&focus=kpi:savings-rate',
    );
  });

  it('sends an AI summary to the month it was written about', () => {
    expect(
      insightHref(
        makeInsight({ type: 'ai.summary', data: { periodKey: '2026-08', modelId: 'local' } }),
      ),
    ).toBe('/dashboard?tab=overview&month=2026-08');
    expect(insightHref(makeInsight({ type: 'ai.summary', data: null }))).toBeNull();
  });

  it('sends the operational backlogs to the queue that clears them', () => {
    expect(insightHref(makeInsight({ type: 'operational.unapproved_count' }))).toBe(
      '/statements/approve',
    );
    expect(insightHref(makeInsight({ type: 'operational.uncategorized_count' }))).toBe(
      '/statements/submit?missingCategory=true',
    );
    expect(insightHref(makeInsight({ type: 'operational.duplicate_detected' }))).toBe(
      '/statements/unapproved-cash',
    );
  });

  it('sends the remaining signals to the page that shows the same number', () => {
    expect(insightHref(makeInsight({ type: 'pattern.risky_allocation' }))).toBe(
      '/net-worth?focus=card:risk',
    );
    expect(insightHref(makeInsight({ type: 'forecast.monthly' }))).toBe('/dashboard?tab=overview');
    expect(insightHref(makeInsight({ type: 'pattern.detected' }))).toBe('/subscriptions');
  });

  it('leaves types with nowhere useful to go unlinked', () => {
    expect(insightHref(makeInsight({ type: 'workflow.tip' }))).toBeNull();
    expect(insightHref(makeInsight({ type: 'rule.suggestion' }))).toBeNull();
  });
});
