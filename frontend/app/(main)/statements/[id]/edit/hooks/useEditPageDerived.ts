import { flattenStatementCategories, getCategoryDisplayName } from '@/app/lib/statement-categories';
import type { StatementStageActionId } from '@/app/lib/statement-workflow';
import { formatStoredDate } from '@/app/lib/user-format-store';
import type { ParsingDetailsData } from '../components/ParsingDetailsPanel';
import {
  countArray,
  filterEnabledCategories,
  isIdEmpty,
  labelValue,
  sumTransactionCredit,
  sumTransactionDebit,
} from '../editHelpers';
import { buildReadinessMessage, buildReadinessTitle } from '../helpers/readiness';
import type { UseStatementEditFormReturn } from './useStatementEditFormTypes';

type Labels = Record<string, { value?: string } | undefined>;
type Statement = UseStatementEditFormReturn['statement'];

type CategoryFlags = {
  hasStatementCategory: boolean;
  hasDisabledStatementCategory: boolean;
  isStatementCategoryEmpty: boolean;
};

function isCategoryEnabled(cat: { isEnabled?: boolean } | null | undefined): boolean {
  return cat == null || cat.isEnabled !== false;
}

function computeCategoryFlags(statement: Statement): CategoryFlags {
  if (!statement) {
    return {
      hasStatementCategory: false,
      hasDisabledStatementCategory: false,
      isStatementCategoryEmpty: true,
    };
  }
  const catId = statement.categoryId;
  const catItemId = statement.category?.id;
  const isEmpty = isIdEmpty(catId) && isIdEmpty(catItemId);
  return {
    hasStatementCategory: !isEmpty,
    hasDisabledStatementCategory: !isCategoryEnabled(statement.category),
    isStatementCategoryEmpty: isEmpty,
  };
}

type ParsingCounts = { parsingErrorCount: number; parsingWarningCount: number };

function computeParsingCounts(pd?: ParsingDetailsData | null): ParsingCounts {
  return {
    parsingErrorCount: countArray(pd?.errors),
    parsingWarningCount: countArray(pd?.warnings),
  };
}

function checkCategoryIssues(flags: CategoryFlags, missingCount: number): boolean {
  return !flags.hasStatementCategory || flags.hasDisabledStatementCategory || missingCount > 0;
}

function computeReadinessSeverity(
  hasCategoryIssues: boolean,
  parsingErrorCount: number,
  parsingWarningCount: number,
): 'success' | 'warning' | 'error' {
  if (hasCategoryIssues) {
    return 'error';
  }
  if (parsingErrorCount > 0 || parsingWarningCount > 0) {
    return 'warning';
  }
  return 'success';
}

function getDisplayCategoryName(statement: Statement, locale: string): string {
  const cat = statement?.category;
  if (!cat?.name) {
    return '';
  }
  return getCategoryDisplayName(
    { name: cat.name, source: cat.source, isSystem: cat.isSystem },
    locale,
  ).trim();
}

function computeSelectedCategoryName(
  form: UseStatementEditFormReturn,
  locale: string,
  labels: Labels,
): string {
  const displayName = getDisplayCategoryName(form.statement, locale);
  const flatCats = flattenStatementCategories(form.categories, '', locale);
  const catId = form.statement?.categoryId;
  const fallback = flatCats.find(c => c.id === catId)?.name;
  return displayName || fallback || labelValue(labels.categoryButton, 'Category');
}

function computeMissingCategoryCount(
  transactions: UseStatementEditFormReturn['transactions'],
): number {
  return transactions.filter(tx => {
    const noCategory = isIdEmpty(tx.categoryId) && isIdEmpty(tx.category?.id);
    return noCategory || tx.category?.isEnabled === false;
  }).length;
}

function buildStageActionLabels(labels: Labels): Record<StatementStageActionId, string> {
  return {
    submitForApproval: labelValue(labels.submitForApproval, 'Submit'),
    unapprove: labelValue(labels.unapprove, 'Unapprove'),
    pay: labelValue(labels.pay, 'Pay'),
    rollbackToApprove: labelValue(labels.rollbackToApprove, 'Return to approve'),
  };
}

function buildStageActionToasts(labels: Labels): Record<StatementStageActionId, string> {
  return {
    submitForApproval: labelValue(labels.submitSuccess, 'Statement submitted for approval'),
    unapprove: labelValue(labels.unapproveSuccess, 'Statement moved back to submit'),
    pay: labelValue(labels.paySuccess, 'Statement moved to pay'),
    rollbackToApprove: labelValue(
      labels.rollbackToApproveSuccess,
      'Statement moved back to approve',
    ),
  };
}

function buildPeriodLabel(form: UseStatementEditFormReturn): string {
  const { statement } = form;
  if (!(statement?.statementDateFrom && statement.statementDateTo)) {
    return '';
  }
  return `${formatStoredDate(statement.statementDateFrom)} - ${formatStoredDate(statement.statementDateTo)}`;
}

function buildBalanceStartLabel(
  form: UseStatementEditFormReturn,
  formatNumber: (n?: number | null) => string,
): string {
  const { statement } = form;
  if (statement?.balanceStart == null || statement.balanceStart === '') {
    return '';
  }
  return formatNumber(Number(statement.balanceStart));
}

type DerivedParams = {
  form: UseStatementEditFormReturn;
  locale: string;
  labels: Labels;
  formatNumber: (n?: number | null) => string;
};

export type EditPageDerived = ReturnType<typeof computeEditPageDerived>;

export function computeEditPageDerived({
  form,
  locale,
  labels,
  formatNumber,
}: DerivedParams): EditPageDerived {
  const missingCategoryCount = computeMissingCategoryCount(form.transactions);
  const totalIncome = sumTransactionCredit(form.transactions);
  const totalExpense = sumTransactionDebit(form.transactions);
  const selectedStatementCategoryName = computeSelectedCategoryName(form, locale, labels);
  const catFlags = computeCategoryFlags(form.statement);
  const parsingCounts = computeParsingCounts(form.statement?.parsingDetails);
  const hasCategoryIssues = checkCategoryIssues(catFlags, missingCategoryCount);
  const readinessSeverity = computeReadinessSeverity(
    hasCategoryIssues,
    parsingCounts.parsingErrorCount,
    parsingCounts.parsingWarningCount,
  );
  const readinessTitle = buildReadinessTitle(readinessSeverity, labels);
  const readinessMessage = buildReadinessMessage({
    ...catFlags,
    ...parsingCounts,
    missingCategoryCount,
    transactionsCount: form.transactions.length,
    labels,
  });
  const stageActionLabels = buildStageActionLabels(labels);
  const stageActionToasts = buildStageActionToasts(labels);
  const enabledCategories = filterEnabledCategories(form.categories);
  const flattenedCategories = flattenStatementCategories(form.categories, '', locale);
  const flattenedEnabledCategories = flattenStatementCategories(enabledCategories, '', locale);
  return {
    ...catFlags,
    ...parsingCounts,
    missingCategoryCount,
    totalIncome,
    totalExpense,
    selectedStatementCategoryName,
    readinessSeverity,
    readinessTitle,
    readinessMessage,
    readinessInlineText: `${readinessTitle}: ${readinessMessage}`,
    stageActionLabels,
    stageActionToasts,
    flattenedCategories,
    flattenedEnabledCategories,
    enabledCategories,
    periodLabel: buildPeriodLabel(form),
    balanceStartLabel: buildBalanceStartLabel(form, formatNumber),
    parsingDetails: form.statement?.parsingDetails ?? null,
    selectedCategoryId: form.statement?.categoryId ?? '',
  };
}
