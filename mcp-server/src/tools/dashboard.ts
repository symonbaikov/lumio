import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { client } from '../client.js';

export function registerDashboardTools(server: McpServer): void {
  server.tool(
    'get_dashboard',
    'Get current workspace financial dashboard (totals, balances, recent activity)',
    {
      dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
    },
    async ({ dateFrom, dateTo }) => {
      const { data } = await client.get('/dashboard', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_trends',
    'Get income/expense trends over time periods',
    {
      period: z
        .enum(['week', 'month', 'quarter', 'year'])
        .optional()
        .default('month')
        .describe('Aggregation period'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
    },
    async (params) => {
      const { data } = await client.get('/dashboard/trends', { params });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'generate_report',
    'Generate a financial report for a given date range',
    {
      dateFrom: z.string().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().describe('End date (YYYY-MM-DD)'),
      type: z
        .enum(['summary', 'detailed', 'category'])
        .optional()
        .default('summary')
        .describe('Report type'),
      format: z.enum(['json', 'csv']).optional().default('json').describe('Output format'),
    },
    async (body) => {
      const { data } = await client.post('/reports/generate', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_insights',
    'Get AI-generated financial insights and anomaly detections',
    {
      limit: z.number().int().min(1).max(20).optional().default(10),
    },
    async ({ limit }) => {
      const { data } = await client.get('/insights', { params: { limit } });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
