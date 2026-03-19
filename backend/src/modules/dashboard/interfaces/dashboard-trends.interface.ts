export interface DashboardTrendsResponse {
  // Combined daily income/expense from all sources
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  // Top expense categories across all sources
  categories: Array<{ name: string; amount: number; count: number }>;
  // Top income counterparties across all sources
  counterparties: Array<{ name: string; amount: number; count: number }>;
  // Source breakdown
  sources: {
    statements: { income: number; expense: number; rows: number };
  };
  effectiveEndDate?: string;
  effectiveSince?: string;
}
