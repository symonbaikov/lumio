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

  it('sends Stoic advice about a class to that class in Budgets', () => {
    expect(
      insightHref(makeInsight({ type: 'stoic.intent_gap', data: { stoicClass: 'leisure' } })),
    ).toBe('/budgets?focus=stoic:leisure');
    expect(
      insightHref(makeInsight({ type: 'stoic.virtue_neglected', data: { stoicClass: 'virtue' } })),
    ).toBe('/budgets?focus=stoic:virtue');
    expect(insightHref(makeInsight({ type: 'stoic.praise', data: {} }))).toBe('/budgets');
  });

  it('sends a repeated overrun to its budget card, and a leisure habit to leisure', () => {
    expect(
      insightHref(makeInsight({ type: 'stoic.repeated', data: { categoryId: 'cat-1' } })),
    ).toBe('/budgets?focus=budget%3Acat-1');
    expect(
      insightHref(makeInsight({ type: 'stoic.repeated', data: { stoicClass: 'leisure' } })),
    ).toBe('/budgets?focus=stoic:leisure');
  });

  it('sends unjudged categories to the list where they are judged', () => {
    expect(insightHref(makeInsight({ type: 'stoic.unclassified' }))).toBe(
      '/budgets?focus=stoic:unclassified',
    );
  });

  it('sends plan advice to the budget it is about, or to its class', () => {
    expect(insightHref(makeInsight({ type: 'stoic.plan', data: { categoryId: 'c1' } }))).toBe(
      '/budgets?focus=budget%3Ac1',
    );
    expect(insightHref(makeInsight({ type: 'stoic.plan', data: { stoicClass: 'virtue' } }))).toBe(
      '/budgets?focus=stoic:virtue',
    );
  });

  it('sends the generosity hint to the virtue class', () => {
    expect(
      insightHref(makeInsight({ type: 'stoic.generosity', data: { stoicClass: 'virtue' } })),
    ).toBe('/budgets?focus=stoic:virtue');
  });

  it('sends goal advice and goal praise to the goal', () => {
    expect(insightHref(makeInsight({ type: 'stoic.goal', data: { goalId: 'g1' } }))).toBe('/goals/g1');
    expect(insightHref(makeInsight({ type: 'stoic.goal', data: null }))).toBe('/goals');
    expect(insightHref(makeInsight({ type: 'stoic.praise', data: { goalId: 'g1' } }))).toBe(
      '/goals/g1',
    );
  });

  it('sends habits, fortune, commitments and subscriptions to where they are seen', () => {
    expect(insightHref(makeInsight({ type: 'stoic.habit' }))).toBe('/statements/top-merchants');
    expect(insightHref(makeInsight({ type: 'stoic.fortune' }))).toBe('/dashboard?tab=overview');
    expect(insightHref(makeInsight({ type: 'stoic.commitments' }))).toBe('/dashboard?tab=overview');
    expect(insightHref(makeInsight({ type: 'stoic.subscriptions' }))).toBe('/subscriptions');
  });

  it('sends an expert principle to where its numbers live', () => {
    expect(
      insightHref(makeInsight({ type: 'expert.principle', data: { target: 'budgets' } })),
    ).toBe('/budgets');
    expect(
      insightHref(makeInsight({ type: 'expert.principle', data: { target: 'merchants' } })),
    ).toBe('/statements/top-merchants');
  });
});
