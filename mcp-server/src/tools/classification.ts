import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { client } from '../client.js';

export function registerClassificationTools(server: McpServer): void {
  server.tool(
    'classify_transaction',
    'Run AI auto-categorization for a single transaction',
    { id: z.string().uuid().describe('Transaction ID') },
    async ({ id }) => {
      const { data } = await client.post(`/classification/transaction/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'bulk_classify',
    'Run AI auto-categorization for multiple transactions',
    {
      ids: z.array(z.string().uuid()).min(1).describe('Transaction IDs to classify'),
    },
    async ({ ids }) => {
      const { data } = await client.post('/classification/bulk', { ids });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
