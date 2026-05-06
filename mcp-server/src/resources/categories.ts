import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client.js';

export function registerCategoryResources(server: McpServer): void {
  server.resource(
    'categories',
    'lumio://categories',
    { description: 'Full category tree for the workspace', mimeType: 'application/json' },
    async () => {
      const { data } = await client.get('/categories');
      return {
        contents: [{ uri: 'lumio://categories', text: JSON.stringify(data, null, 2), mimeType: 'application/json' }],
      };
    },
  );
}
