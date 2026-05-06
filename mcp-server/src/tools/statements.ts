import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { client } from '../client.js';

export function registerStatementTools(server: McpServer): void {
  server.tool(
    'list_statements',
    'List all bank statements in the workspace',
    {
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
    },
    async ({ page, limit }) => {
      const { data } = await client.get('/statements', { params: { page, limit } });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'get_statement',
    'Get statement details and processing status',
    { id: z.string().uuid().describe('Statement ID') },
    async ({ id }) => {
      const { data } = await client.get(`/statements/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'upload_statement',
    'Upload a bank statement file (base64 encoded)',
    {
      filename: z.string().describe('Original filename with extension (e.g. statement.pdf)'),
      contentBase64: z.string().describe('File content encoded as base64'),
      mimeType: z
        .string()
        .optional()
        .default('application/octet-stream')
        .describe('MIME type of the file'),
    },
    async ({ filename, contentBase64, mimeType }) => {
      const buffer = Buffer.from(contentBase64, 'base64');
      const FormData = (await import('node:buffer')).Blob;

      // Build multipart form data manually
      const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`;
      const fileContent = buffer;
      const body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
        ),
        fileContent,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const { data } = await client.post('/statements/upload', body, {
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    'delete_statement',
    'Delete a bank statement and its transactions',
    { id: z.string().uuid().describe('Statement ID') },
    async ({ id }) => {
      await client.delete(`/statements/${id}`);
      return { content: [{ type: 'text', text: `Statement ${id} deleted successfully` }] };
    },
  );
}
