import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client.js';

export function registerDashboardResources(server: McpServer): void {
  server.resource(
    'dashboard',
    'lumio://dashboard',
    { description: 'Current workspace financial dashboard snapshot', mimeType: 'application/json' },
    async () => {
      const { data } = await client.get('/dashboard');
      return {
        contents: [{ uri: 'lumio://dashboard', text: JSON.stringify(data, null, 2), mimeType: 'application/json' }],
      };
    },
  );
}
