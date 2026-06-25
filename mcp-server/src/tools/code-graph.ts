import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { queryCodeGraph } from '../graph-rag.js';

export function registerCodeGraphTools(server: McpServer): void {
  server.tool(
    'query_code_graph',
    'Query the committed Graphify code graph for Lumio architecture context',
    {
      query: z.string().min(1).describe('Natural-language codebase question or keywords'),
      limit: z.number().int().min(1).max(25).optional().default(8),
      includeEdges: z.boolean().optional().default(true),
    },
    async ({ query, limit, includeEdges }) => {
      const result = await queryCodeGraph({ query, limit, includeEdges });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
