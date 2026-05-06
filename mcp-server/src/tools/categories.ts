import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { client } from '../client.js';

export function registerCategoryTools(server: McpServer): void {
  server.tool(
    'list_categories',
    'List all transaction categories (hierarchical tree)',
    {},
    async () => {
      const { data } = await client.get('/categories');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'create_category',
    'Create a new transaction category',
    {
      name: z.string().describe('Category name'),
      type: z.enum(['income', 'expense']).describe('Category type'),
      parentId: z.string().uuid().optional().describe('Parent category ID for sub-categories'),
      color: z.string().optional().describe('Hex color (e.g. #FF5733)'),
    },
    async (body) => {
      const { data } = await client.post('/categories', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'update_category',
    'Update a category name, color or parent',
    {
      id: z.string().uuid().describe('Category ID'),
      name: z.string().optional(),
      color: z.string().optional(),
      parentId: z.string().uuid().nullable().optional(),
      isEnabled: z.boolean().optional(),
    },
    async ({ id, ...body }) => {
      const { data } = await client.put(`/categories/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'delete_category',
    'Delete a category',
    { id: z.string().uuid().describe('Category ID') },
    async ({ id }) => {
      await client.delete(`/categories/${id}`);
      return { content: [{ type: 'text', text: `Category ${id} deleted successfully` }] };
    },
  );
}
