import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerTransactionTools } from './tools/transactions.js';
import { registerStatementTools } from './tools/statements.js';
import { registerCategoryTools } from './tools/categories.js';
import { registerClassificationTools } from './tools/classification.js';
import { registerDashboardTools } from './tools/dashboard.js';
import { registerDataEntryTools } from './tools/data-entry.js';
import { registerWebhookTools } from './tools/webhooks.js';

import { registerTransactionResources } from './resources/transactions.js';
import { registerCategoryResources } from './resources/categories.js';
import { registerDashboardResources } from './resources/dashboard.js';

const server = new McpServer({
  name: 'lumio',
  version: '1.0.0',
});

// Register tools
registerTransactionTools(server);
registerStatementTools(server);
registerCategoryTools(server);
registerClassificationTools(server);
registerDashboardTools(server);
registerDataEntryTools(server);
registerWebhookTools(server);

// Register resources
registerTransactionResources(server);
registerCategoryResources(server);
registerDashboardResources(server);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
