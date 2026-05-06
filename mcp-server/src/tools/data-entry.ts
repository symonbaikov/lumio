import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { client } from '../client.js';

export function registerDataEntryTools(server: McpServer): void {
  server.tool(
    'create_data_entry',
    'Manually record an income or expense entry',
    {
      type: z.enum(['income', 'expense']).describe('Entry type'),
      amount: z.number().positive().describe('Amount (positive number)'),
      currency: z.string().length(3).optional().default('KZT').describe('ISO 4217 currency code'),
      description: z.string().describe('Description of the entry'),
      date: z.string().describe('Entry date (YYYY-MM-DD)'),
      categoryId: z.string().uuid().optional().describe('Category ID'),
    },
    async (body) => {
      const { data } = await client.post('/data-entry', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'list_data_entries',
    'List manually recorded income/expense entries',
    {
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      type: z.enum(['income', 'expense']).optional(),
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(50),
    },
    async ({ dateFrom, dateTo, type, page, limit }) => {
      const { data } = await client.get('/data-entry', {
        params: { date_from: dateFrom, date_to: dateTo, type, page, limit },
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
