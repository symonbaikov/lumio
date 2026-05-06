import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { client } from '../client.js';

export function registerTransactionTools(server: McpServer): void {
  server.tool(
    'list_transactions',
    'List and search transactions with optional filters',
    {
      statementId: z.string().uuid().optional().describe('Filter by statement ID'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      type: z.enum(['income', 'expense']).optional().describe('Transaction type'),
      categoryId: z.string().uuid().optional().describe('Filter by category ID'),
      search: z.string().optional().describe('Full-text search query'),
      page: z.number().int().min(1).optional().default(1).describe('Page number'),
      limit: z.number().int().min(1).max(100).optional().default(50).describe('Items per page'),
    },
    async ({ statementId, dateFrom, dateTo, type, categoryId, search, page, limit }) => {
      const { data } = await client.get('/transactions', {
        params: { statementId, date_from: dateFrom, date_to: dateTo, type, categoryId, search, page, limit },
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_transaction',
    'Get a single transaction by ID',
    { id: z.string().uuid().describe('Transaction ID') },
    async ({ id }) => {
      const { data } = await client.get(`/transactions/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'update_transaction',
    'Update transaction fields (category, description, notes)',
    {
      id: z.string().uuid().describe('Transaction ID'),
      categoryId: z.string().uuid().nullable().optional().describe('Category ID'),
      description: z.string().optional().describe('Custom description'),
      notes: z.string().optional().describe('Notes'),
    },
    async ({ id, ...body }) => {
      const { data } = await client.put(`/transactions/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'bulk_update_transactions',
    'Update category for multiple transactions at once',
    {
      ids: z.array(z.string().uuid()).min(1).describe('Transaction IDs to update'),
      categoryId: z.string().uuid().nullable().describe('Category ID to assign (null to clear)'),
    },
    async ({ ids, categoryId }) => {
      const { data } = await client.post('/transactions/bulk-update', { ids, categoryId });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'deduplicate_transactions',
    'Run deduplication to remove duplicate transactions across statements',
    {
      statementId: z.string().uuid().optional().describe('Limit deduplication to a specific statement'),
    },
    async ({ statementId }) => {
      const { data } = await client.post('/transactions/deduplicate', { statementId });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
