import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { client } from '../client.js';

const WEBHOOK_EVENTS = [
  'transaction.created',
  'transaction.updated',
  'statement.uploaded',
  'statement.processed',
  'statement.failed',
] as const;

export function registerWebhookTools(server: McpServer): void {
  server.tool(
    'list_webhooks',
    'List all webhook subscriptions in the workspace',
    {},
    async () => {
      const { data } = await client.get('/webhook-subscriptions');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'create_webhook',
    'Create a webhook subscription to receive event notifications',
    {
      name: z.string().describe('Webhook name'),
      url: z.string().url().describe('Target URL to receive POST requests'),
      events: z
        .array(z.enum(WEBHOOK_EVENTS))
        .min(1)
        .describe('Events to subscribe to'),
    },
    async (body) => {
      const { data } = await client.post('/webhook-subscriptions', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'delete_webhook',
    'Delete a webhook subscription',
    { id: z.string().uuid().describe('Webhook subscription ID') },
    async ({ id }) => {
      await client.delete(`/webhook-subscriptions/${id}`);
      return { content: [{ type: 'text', text: `Webhook ${id} deleted successfully` }] };
    },
  );
}
