import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { queryCodeGraph, resolveGraphPath, validateGraphSources } from './graph-rag.js';

async function withGraphFile(
  graph: unknown,
  callback: (paths: { dir: string; graphPath: string }) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'lumio-graph-rag-'));
  const graphPath = path.join(dir, 'graph.json');

  try {
    await writeFile(graphPath, JSON.stringify(graph), 'utf8');
    await callback({ dir, graphPath });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('returns a rebuild warning when the graph file is missing', async () => {
  const missingPath = path.join(tmpdir(), 'missing-lumio-graph.json');

  const result = await queryCodeGraph({
    query: 'authentication guard',
    graphPath: missingPath,
  });

  assert.equal(result.matches.length, 0);
  assert.match(result.warnings.join('\n'), /npm run graphify:build/);
  assert.equal(result.graphPath, missingPath);
});

test('ranks lexical node matches ahead of unrelated nodes and preserves source locations', async () => {
  await withGraphFile(
    {
      nodes: [
        {
          id: 'node:auth-guard',
          label: 'JwtAuthGuard',
          type: 'Class',
          source_location: 'backend/src/common/guards/jwt-auth.guard.ts:16',
          summary: 'Authenticates JWT and API key requests.',
        },
        {
          id: 'node:dashboard',
          label: 'DashboardService',
          type: 'Class',
          source_location: 'backend/src/modules/dashboard/dashboard.service.ts:1',
          summary: 'Builds chart data.',
        },
      ],
      edges: [],
    },
    async ({ graphPath }) => {
      const result = await queryCodeGraph({
        query: 'auth guard service',
        graphPath,
        limit: 2,
      });

      assert.equal(result.matches.length, 2);
      assert.equal(result.matches[0].id, 'node:auth-guard');
      assert.equal(result.matches[0].sourceLocation, 'backend/src/common/guards/jwt-auth.guard.ts:16');
      assert.ok(result.matches[0].score > result.matches[1].score);
    },
  );
});

test('includes only real adjacent graph edges when requested', async () => {
  await withGraphFile(
    {
      nodes: [
        { id: 'node:storage-controller', label: 'StorageController', type: 'Class' },
        { id: 'node:storage-service', label: 'StorageService', type: 'Class' },
        { id: 'node:audit-service', label: 'AuditService', type: 'Class' },
      ],
      edges: [
        {
          source: 'node:storage-controller',
          target: 'node:storage-service',
          type: 'USES',
          source_location: 'backend/src/modules/storage/storage.controller.ts:40',
        },
        {
          source: 'node:audit-service',
          target: 'node:storage-service',
          type: 'OBSERVES',
        },
      ],
    },
    async ({ graphPath }) => {
      const result = await queryCodeGraph({
        query: 'storage controller',
        graphPath,
        includeEdges: true,
        limit: 1,
      });

      assert.deepEqual(
        result.edges.map(edge => `${edge.source}->${edge.target}:${edge.type}`),
        ['node:storage-controller->node:storage-service:USES'],
      );
      assert.equal(result.edges[0].sourceLocation, 'backend/src/modules/storage/storage.controller.ts:40');
    },
  );
});

test('reads adjacent edges from Graphify graph links', async () => {
  await withGraphFile(
    {
      nodes: [
        { id: 'src_index', label: 'index.ts', file_type: 'code' },
        { id: 'src_index_server', label: 'server', file_type: 'code' },
      ],
      links: [
        {
          source: 'src_index',
          target: 'src_index_server',
          relation: 'defines',
          source_file: 'mcp-server/src/index.ts',
          source_location: 'L17',
        },
      ],
    },
    async ({ graphPath }) => {
      const result = await queryCodeGraph({
        query: 'index',
        graphPath,
        includeEdges: true,
      });

      assert.equal(result.edges.length, 1);
      assert.equal(result.edges[0].type, 'defines');
      assert.equal(result.edges[0].sourceLocation, 'mcp-server/src/index.ts:L17');
    },
  );
});

test('resolves graph path from environment before walking ancestors', async () => {
  await withGraphFile({ nodes: [], edges: [] }, async ({ graphPath }) => {
    const resolved = await resolveGraphPath({
      env: { LUMIO_GRAPHIFY_GRAPH_PATH: graphPath },
      startDir: tmpdir(),
    });

    assert.equal(resolved, graphPath);
  });
});

test('rejects unsafe committed graph sources', () => {
  const violations = validateGraphSources({
    nodes: [
      { id: 'safe', source_location: 'backend/src/main.ts:1' },
      { id: 'dependency', source_location: 'node_modules/pkg/index.js:1' },
      { id: 'upload', source_location: 'backend/uploads/statement.pdf' },
      { id: 'env', source_location: '.env:1' },
      { id: 'dist', source_file: 'mcp-server/dist/index.js', source_location: 'L1' },
    ],
    edges: [
      { source: 'safe', target: 'dependency', source_location: 'frontend/.next/server/app.js:1' },
    ],
  });

  assert.deepEqual(violations, [
    'node_modules/pkg/index.js:1',
    'backend/uploads/statement.pdf',
    '.env:1',
    'mcp-server/dist/index.js:L1',
    'frontend/.next/server/app.js:1',
  ]);
});
