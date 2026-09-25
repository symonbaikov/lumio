import type { StaticImageData } from 'next/image';
import adviceForecastDark from './screens/advice-forecast-dark.webp';
import adviceForecastLight from './screens/advice-forecast-light.webp';
import advicePricesDark from './screens/advice-prices-dark.webp';
import advicePricesLight from './screens/advice-prices-light.webp';
import budgetsCardsDark from './screens/budgets-cards-dark.webp';
import budgetsCardsLight from './screens/budgets-cards-light.webp';
import budgetsOverDark from './screens/budgets-over-dark.webp';
import budgetsOverLight from './screens/budgets-over-light.webp';
import cryptoConnectDark from './screens/crypto-connect-dark.webp';
import cryptoConnectLight from './screens/crypto-connect-light.webp';
import cryptoPortfolioDark from './screens/crypto-portfolio-dark.webp';
import cryptoPortfolioLight from './screens/crypto-portfolio-light.webp';
import dashboardCategoriesDark from './screens/dashboard-categories-dark.webp';
import dashboardCategoriesLight from './screens/dashboard-categories-light.webp';
import dashboardMonthDark from './screens/dashboard-month-dark.webp';
import dashboardMonthLight from './screens/dashboard-month-light.webp';
import dashboardRecentDark from './screens/dashboard-recent-dark.webp';
import dashboardRecentLight from './screens/dashboard-recent-light.webp';
import goalsListDark from './screens/goals-list-dark.webp';
import goalsListLight from './screens/goals-list-light.webp';
import goalsProgressDark from './screens/goals-progress-dark.webp';
import goalsProgressLight from './screens/goals-progress-light.webp';
import netWorthAllocationDark from './screens/net-worth-allocation-dark.webp';
import netWorthAllocationLight from './screens/net-worth-allocation-light.webp';
import netWorthChartDark from './screens/net-worth-chart-dark.webp';
import netWorthChartLight from './screens/net-worth-chart-light.webp';
import netWorthRiskDark from './screens/net-worth-risk-dark.webp';
import netWorthRiskLight from './screens/net-worth-risk-light.webp';
import reportsHistoryDark from './screens/reports-history-dark.webp';
import reportsHistoryLight from './screens/reports-history-light.webp';
import reportsSchedulesDark from './screens/reports-schedules-dark.webp';
import reportsSchedulesLight from './screens/reports-schedules-light.webp';
import reportsTemplatesDark from './screens/reports-templates-dark.webp';
import reportsTemplatesLight from './screens/reports-templates-light.webp';
import roiChartDark from './screens/roi-chart-dark.webp';
import roiChartLight from './screens/roi-chart-light.webp';
import roiInputsDark from './screens/roi-inputs-dark.webp';
import roiInputsLight from './screens/roi-inputs-light.webp';
import roiTableDark from './screens/roi-table-dark.webp';
import roiTableLight from './screens/roi-table-light.webp';
import statementsListDark from './screens/statements-list-dark.webp';
import statementsListLight from './screens/statements-list-light.webp';
import statementsUploadDark from './screens/statements-upload-dark.webp';
import statementsUploadLight from './screens/statements-upload-light.webp';
import subscriptionsCalendarDark from './screens/subscriptions-calendar-dark.webp';
import subscriptionsCalendarLight from './screens/subscriptions-calendar-light.webp';
import subscriptionsKpisDark from './screens/subscriptions-kpis-dark.webp';
import subscriptionsKpisLight from './screens/subscriptions-kpis-light.webp';
import subscriptionsListDark from './screens/subscriptions-list-dark.webp';
import subscriptionsListLight from './screens/subscriptions-list-light.webp';
import tablesGridDark from './screens/tables-grid-dark.webp';
import tablesGridLight from './screens/tables-grid-light.webp';
import tablesListDark from './screens/tables-list-dark.webp';
import tablesListLight from './screens/tables-list-light.webp';
import taxDeclarationChecksDark from './screens/tax-declaration-checks-dark.webp';
import taxDeclarationChecksLight from './screens/tax-declaration-checks-light.webp';
import taxDeclarationDraftDark from './screens/tax-declaration-draft-dark.webp';
import taxDeclarationDraftLight from './screens/tax-declaration-draft-light.webp';
import taxDeclarationProfileDark from './screens/tax-declaration-profile-dark.webp';
import taxDeclarationProfileLight from './screens/tax-declaration-profile-light.webp';
import workspacesCategoriesDark from './screens/workspaces-categories-dark.webp';
import workspacesCategoriesLight from './screens/workspaces-categories-light.webp';
import workspacesInvitationsDark from './screens/workspaces-invitations-dark.webp';
import workspacesInvitationsLight from './screens/workspaces-invitations-light.webp';
import workspacesListDark from './screens/workspaces-list-dark.webp';
import workspacesListLight from './screens/workspaces-list-light.webp';
import type { TutorialStepId } from './welcome-tutorial-routes';

/**
 * Frames of the step layout. With three fragments the first takes the large frame and
 * the other two share the column beside it; two fragments get a pair of equal frames.
 * scripts/capture-tutorial-screenshots.mjs cuts every fragment to its frame, so the
 * aspect ratios below and the ones in that script have to stay in step.
 */
export const FRAME_ASPECT = { hero: 1.55, side: 2.24, pair: 1.55 } as const;

export type TutorialFrame = keyof typeof FRAME_ASPECT;

export interface TutorialFragment {
  /** Key of the caption in the `welcomeTutorialSteps` dictionary. */
  id: string;
  frame: TutorialFrame;
  light: StaticImageData;
  dark: StaticImageData;
}

/** Screenshot fragments per step, from the Keller Design Studio demo workspace. */
export const TUTORIAL_SCREENS: Record<TutorialStepId, TutorialFragment[]> = {
  dashboard: [
    {
      id: 'categories',
      frame: 'hero',
      light: dashboardCategoriesLight,
      dark: dashboardCategoriesDark,
    },
    { id: 'month', frame: 'side', light: dashboardMonthLight, dark: dashboardMonthDark },
    { id: 'recent', frame: 'side', light: dashboardRecentLight, dark: dashboardRecentDark },
  ],
  statements: [
    { id: 'list', frame: 'pair', light: statementsListLight, dark: statementsListDark },
    { id: 'upload', frame: 'pair', light: statementsUploadLight, dark: statementsUploadDark },
  ],
  tables: [
    { id: 'list', frame: 'pair', light: tablesListLight, dark: tablesListDark },
    { id: 'grid', frame: 'pair', light: tablesGridLight, dark: tablesGridDark },
  ],
  workspaces: [
    { id: 'list', frame: 'hero', light: workspacesListLight, dark: workspacesListDark },
    {
      id: 'invitations',
      frame: 'side',
      light: workspacesInvitationsLight,
      dark: workspacesInvitationsDark,
    },
    {
      id: 'categories',
      frame: 'side',
      light: workspacesCategoriesLight,
      dark: workspacesCategoriesDark,
    },
  ],
  reports: [
    { id: 'templates', frame: 'hero', light: reportsTemplatesLight, dark: reportsTemplatesDark },
    { id: 'history', frame: 'side', light: reportsHistoryLight, dark: reportsHistoryDark },
    { id: 'schedules', frame: 'side', light: reportsSchedulesLight, dark: reportsSchedulesDark },
  ],
  taxDeclaration: [
    { id: 'draft', frame: 'hero', light: taxDeclarationDraftLight, dark: taxDeclarationDraftDark },
    {
      id: 'profile',
      frame: 'side',
      light: taxDeclarationProfileLight,
      dark: taxDeclarationProfileDark,
    },
    {
      id: 'checks',
      frame: 'side',
      light: taxDeclarationChecksLight,
      dark: taxDeclarationChecksDark,
    },
  ],
  netWorth: [
    { id: 'chart', frame: 'hero', light: netWorthChartLight, dark: netWorthChartDark },
    {
      id: 'allocation',
      frame: 'side',
      light: netWorthAllocationLight,
      dark: netWorthAllocationDark,
    },
    { id: 'risk', frame: 'side', light: netWorthRiskLight, dark: netWorthRiskDark },
  ],
  budgets: [
    { id: 'cards', frame: 'pair', light: budgetsCardsLight, dark: budgetsCardsDark },
    { id: 'over', frame: 'pair', light: budgetsOverLight, dark: budgetsOverDark },
  ],
  advice: [
    { id: 'forecast', frame: 'pair', light: adviceForecastLight, dark: adviceForecastDark },
    { id: 'prices', frame: 'pair', light: advicePricesLight, dark: advicePricesDark },
  ],
  goals: [
    { id: 'list', frame: 'pair', light: goalsListLight, dark: goalsListDark },
    { id: 'progress', frame: 'pair', light: goalsProgressLight, dark: goalsProgressDark },
  ],
  roi: [
    { id: 'chart', frame: 'hero', light: roiChartLight, dark: roiChartDark },
    { id: 'inputs', frame: 'side', light: roiInputsLight, dark: roiInputsDark },
    { id: 'table', frame: 'side', light: roiTableLight, dark: roiTableDark },
  ],
  subscriptions: [
    {
      id: 'calendar',
      frame: 'hero',
      light: subscriptionsCalendarLight,
      dark: subscriptionsCalendarDark,
    },
    { id: 'kpis', frame: 'side', light: subscriptionsKpisLight, dark: subscriptionsKpisDark },
    { id: 'list', frame: 'side', light: subscriptionsListLight, dark: subscriptionsListDark },
  ],
  crypto: [
    { id: 'portfolio', frame: 'pair', light: cryptoPortfolioLight, dark: cryptoPortfolioDark },
    { id: 'connect', frame: 'pair', light: cryptoConnectLight, dark: cryptoConnectDark },
  ],
};
