import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client.js';

export function registerTransactionResources(server: McpServer): void {
  server.resource(
    'transactions',
    'lumio://transactions',
    { description: 'Latest 50 transactions in the workspace', mimeType: 'application/json' },
    async () => {
      const { data } = await client.get('/transactions', { params: { limit: 50, page: 1 } });
      return {
        contents: [{ uri: 'lumio://transactions', text: JSON.stringify(data, null, 2), mimeType: 'application/json' }],
      };
    },
  );
}
