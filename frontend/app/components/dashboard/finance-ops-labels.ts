import type { FinanceOpsLabels } from './finance-ops-model';

type Leaf = { value: string };
type Node = { [key: string]: Node | Leaf };

/** Flattens the intlayer `financeOpsTab` dictionary into the plain strings the model builder needs. */
export function buildFinanceOpsLabels(t: unknown): FinanceOpsLabels {
  const d = t as Node;
  const s = (node: Node | Leaf | undefined, key: string): string =>
    ((node as Node | undefined)?.[key] as Leaf | undefined)?.value ?? '';
  const f = (name: string): Node => (d.features as Node)[name] as Node;
  return {
    checklist: {
      statementsImported: s(d.checklist, 'statementsImported'),
      reviewQueueClear: s(d.checklist, 'reviewQueueClear'),
      categoriesResolved: s(d.checklist, 'categoriesResolved'),
      receiptsMatched: s(d.checklist, 'receiptsMatched'),
      cashReconciled: s(d.checklist, 'cashReconciled'),
    },
    savedViews: {
      uncategorized: s(d.savedViews, 'uncategorized'),
      needsReceipt: s(d.savedViews, 'needsReceipt'),
      statementReview: s(d.savedViews, 'statementReview'),
      largeExpenses: s(d.savedViews, 'largeExpenses'),
      monthClose: s(d.savedViews, 'monthClose'),
    },
    pluralStatement: s(d, 'pluralStatement'),
    pluralWarning: s(d, 'pluralWarning'),
    pluralTransaction: s(d, 'pluralTransaction'),
    pluralReceipt: s(d, 'pluralReceipt'),
    features: {
      importReviewInbox: {
        title: s(f('importReviewInbox'), 'title'),
        summary: s(f('importReviewInbox'), 'summary'),
        primaryActionOpen: s(f('importReviewInbox'), 'primaryActionOpen'),
        primaryActionImport: s(f('importReviewInbox'), 'primaryActionImport'),
        evidence: s(f('importReviewInbox'), 'evidence'),
      },
      transactionTriageMode: {
        title: s(f('transactionTriageMode'), 'title'),
        summary: s(f('transactionTriageMode'), 'summary'),
        primaryAction: s(f('transactionTriageMode'), 'primaryAction'),
        evidence: s(f('transactionTriageMode'), 'evidence'),
      },
      smartCategorySuggestions: {
        title: s(f('smartCategorySuggestions'), 'title'),
        summary: s(f('smartCategorySuggestions'), 'summary'),
        primaryAction: s(f('smartCategorySuggestions'), 'primaryAction'),
        evidenceTopCategory: s(f('smartCategorySuggestions'), 'evidenceTopCategory'),
        evidenceNoPressure: s(f('smartCategorySuggestions'), 'evidenceNoPressure'),
      },
      periodCloseChecklistFeature: {
        title: s(f('periodCloseChecklistFeature'), 'title'),
        summary: s(f('periodCloseChecklistFeature'), 'summary'),
        primaryActionResolve: s(f('periodCloseChecklistFeature'), 'primaryActionResolve'),
        primaryActionExport: s(f('periodCloseChecklistFeature'), 'primaryActionExport'),
        evidence: s(f('periodCloseChecklistFeature'), 'evidence'),
      },
      anomalyDetectionFeed: {
        title: s(f('anomalyDetectionFeed'), 'title'),
        summary: s(f('anomalyDetectionFeed'), 'summary'),
        primaryAction: s(f('anomalyDetectionFeed'), 'primaryAction'),
        evidenceOverdue: s(f('anomalyDetectionFeed'), 'evidenceOverdue'),
        evidenceTopMerchant: s(f('anomalyDetectionFeed'), 'evidenceTopMerchant'),
        evidenceNone: s(f('anomalyDetectionFeed'), 'evidenceNone'),
      },
      reconciliationDashboard: {
        title: s(f('reconciliationDashboard'), 'title'),
        summary: s(f('reconciliationDashboard'), 'summary'),
        primaryAction: s(f('reconciliationDashboard'), 'primaryAction'),
        evidence: s(f('reconciliationDashboard'), 'evidence'),
      },
      savedViewsTeamFilters: {
        title: s(f('savedViewsTeamFilters'), 'title'),
        summary: s(f('savedViewsTeamFilters'), 'summary'),
        primaryAction: s(f('savedViewsTeamFilters'), 'primaryAction'),
        evidence: s(f('savedViewsTeamFilters'), 'evidence'),
      },
      receiptMatchingAssistant: {
        title: s(f('receiptMatchingAssistant'), 'title'),
        summary: s(f('receiptMatchingAssistant'), 'summary'),
        primaryAction: s(f('receiptMatchingAssistant'), 'primaryAction'),
        evidence: s(f('receiptMatchingAssistant'), 'evidence'),
      },
      actionableNotifications: {
        title: s(f('actionableNotifications'), 'title'),
        summary: s(f('actionableNotifications'), 'summary'),
        primaryActionOpen: s(f('actionableNotifications'), 'primaryActionOpen'),
        primaryActionNone: s(f('actionableNotifications'), 'primaryActionNone'),
        evidenceAllClear: s(f('actionableNotifications'), 'evidenceAllClear'),
      },
      explainThisNumber: {
        title: s(f('explainThisNumber'), 'title'),
        summary: s(f('explainThisNumber'), 'summary'),
        primaryAction: s(f('explainThisNumber'), 'primaryAction'),
        evidenceTopCategoryAmount: s(f('explainThisNumber'), 'evidenceTopCategoryAmount'),
        evidenceBalance: s(f('explainThisNumber'), 'evidenceBalance'),
      },
    },
  };
}
