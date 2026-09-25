import type { Insight } from '@/app/hooks/useInsights';

type InsightData = Record<string, unknown> | null;

/**
 * Insights whose destination is the same page every time.
 *
 * Keyed on `type` rather than on the entity's `actions[]`: the same action type
 * (`VIEW_REPORT`) is emitted for a rising category and for a risky allocation,
 * which are two different pages, so the action alone cannot pick a route.
 *
 * `?focus=` names the element the page should scroll to and ring in green —
 * the target side lives in `data-attention` attributes, see useAttentionFocus.
 */
const STATIC_ROUTES: Record<string, string> = {
  'operational.unapproved_count': '/statements/approve',
  'operational.uncategorized_count': '/statements/submit?missingCategory=true',
  'operational.duplicate_detected': '/statements/unapproved-cash',
  'pattern.risky_allocation': '/net-worth?focus=card:risk',
  // The savings-rate KPI lives on Overview; the Trends tab has no such widget.
  'trend.savings_rate': '/dashboard?tab=overview&focus=kpi:savings-rate',
  'forecast.monthly': '/dashboard?tab=overview',
  'pattern.detected': '/subscriptions',
};

/**
 * Insights that point at one record. Several of them are written by hand for
 * the showcase workspace and carry no `data` at all, so each resolver falls
 * back rather than building a URL out of `undefined`.
 */
const DATA_ROUTES: Record<string, (data: InsightData) => string | null> = {
  // The leaderboard has no category ids: a row is keyed by category name.
  'trend.spending_up': data => {
    const name = readString(data, 'categoryName');
    return name === null
      ? null
      : `/statements/top-categories?focus=${encodeURIComponent(
          `category:${name.trim().toLowerCase()}`,
        )}`;
  },
  // The point of this insight is that no budget exists yet, so there is
  // nothing to highlight — open the form that creates one instead.
  'category.dominance': data => {
    const categoryId = readString(data, 'categoryId');
    return categoryId === null
      ? '/budgets'
      : `/budgets?newBudgetCategory=${encodeURIComponent(categoryId)}`;
  },
  // Free-form text from the local model; `periodKey` is the only handle it
  // carries, and it is already the YYYY-MM the dashboard expects.
  'ai.summary': data => {
    const periodKey = readString(data, 'periodKey');
    return periodKey === null ? null : `/dashboard?tab=overview&month=${periodKey}`;
  },
};

/**
 * Where an insight can be looked at or acted on. An insight with no sensible
 * destination returns null and stays a plain, non-interactive notice — better
 * than a link that lands nowhere.
 */
export function insightHref(insight: Insight): string | null {
  const resolve = DATA_ROUTES[insight.type];
  return resolve ? resolve(insight.data) : (STATIC_ROUTES[insight.type] ?? null);
}

function readString(data: InsightData, key: string): string | null {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}
