import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

type GraphNodeRecord = Record<string, unknown>;
type GraphEdgeRecord = Record<string, unknown>;

export type CodeGraphMatch = {
  id: string;
  label: string;
  type: string | null;
  score: number;
  sourceLocation: string | null;
  summary: string | null;
};

export type CodeGraphEdge = {
  source: string;
  target: string;
  type: string | null;
  sourceLocation: string | null;
};

export type CodeGraphQueryResult = {
  query: string;
  graphPath: string | null;
  matches: CodeGraphMatch[];
  edges: CodeGraphEdge[];
  warnings: string[];
};

export type QueryCodeGraphOptions = {
  query: string;
  graphPath?: string | null;
  startDir?: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  limit?: number;
  includeEdges?: boolean;
};

export type ResolveGraphPathOptions = {
  startDir?: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
};

type SourceBearingGraph = {
  nodes?: unknown;
  edges?: unknown;
  links?: unknown;
};

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;
const UNSAFE_SOURCE_PATTERNS = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.env([^/]*|$)/,
  /(^|\/)uploads(\/|$)/,
  /(^|\/)(dist|build|coverage|\.next)(\/|$)/,
  /\.(pdf|png|jpe?g|gif|webp|svg)(:\d+)?$/i,
];

export async function resolveGraphPath(options: ResolveGraphPathOptions = {}): Promise<string | null> {
  const explicitPath = options.env?.LUMIO_GRAPHIFY_GRAPH_PATH;
  if (explicitPath && (await fileExists(explicitPath))) {
    return path.resolve(explicitPath);
  }

  let current = path.resolve(options.startDir ?? process.cwd());

  while (true) {
    const candidate = path.join(current, 'graphify-out', 'graph.json');
    if (await fileExists(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return explicitPath ? path.resolve(explicitPath) : null;
    }

    current = parent;
  }
}

export async function queryCodeGraph(options: QueryCodeGraphOptions): Promise<CodeGraphQueryResult> {
  const graphPath =
    options.graphPath ??
    (await resolveGraphPath({ startDir: options.startDir, env: options.env ?? process.env }));
  const query = options.query.trim();

  if (!graphPath || !(await fileExists(graphPath))) {
    return {
      query,
      graphPath,
      matches: [],
      edges: [],
      warnings: [
        'Graphify graph not found. Run `npm run graphify:build` from the Lumio repository root.',
      ],
    };
  }

  const graph = JSON.parse(await readFile(graphPath, 'utf8')) as SourceBearingGraph;
  const nodes = readNodes(graph);
  const edges = readEdges(graph);
  const limit = clampLimit(options.limit);
  const queryTokens = tokenize(query);
  const warnings: string[] = [];

  if (!queryTokens.length) {
    warnings.push('Query is empty after normalization.');
  }

  const matches = nodes
    .map(node => ({ node, score: scoreNode(node, query, queryTokens) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id))
    .slice(0, limit)
    .map(result => toMatch(result.node, result.score));

  if (!matches.length && queryTokens.length) {
    warnings.push('No matching graph nodes found for this query.');
  }

  const matchedIds = new Set(matches.map(match => match.id));
  const relatedEdges = options.includeEdges
    ? edges.filter(edge => matchedIds.has(edge.source) || matchedIds.has(edge.target)).map(toEdge)
    : [];

  return {
    query,
    graphPath,
    matches,
    edges: relatedEdges,
    warnings,
  };
}

export function validateGraphSources(graph: SourceBearingGraph): string[] {
  const sourceLocations = [
    ...readNodes(graph).flatMap(node => sourceCandidates(node.raw)),
    ...readEdges(graph).flatMap(edge => sourceCandidates(edge.raw)),
  ];
  const seen = new Set<string>();
  const violations: string[] = [];

  for (const sourceLocation of sourceLocations) {
    if (seen.has(sourceLocation)) {
      continue;
    }
    seen.add(sourceLocation);

    if (isUnsafeSource(sourceLocation)) {
      violations.push(sourceLocation);
    }
  }

  return violations;
}

function readNodes(graph: SourceBearingGraph): Array<{ id: string; raw: GraphNodeRecord }> {
  const rawNodes = asRecordArray(graph.nodes);

  return rawNodes
    .map(raw => ({
      id: stringValue(raw.id ?? raw.node_id ?? raw.key),
      raw,
    }))
    .filter((node): node is { id: string; raw: GraphNodeRecord } => Boolean(node.id));
}

function readEdges(graph: SourceBearingGraph): Array<{
  source: string;
  target: string;
  raw: GraphEdgeRecord;
}> {
  const rawEdges = [...asRecordArray(graph.edges), ...asRecordArray(graph.links)];

  return rawEdges
    .map(raw => ({
      source: stringValue(raw.source ?? raw.source_id ?? raw.from),
      target: stringValue(raw.target ?? raw.target_id ?? raw.to),
      raw,
    }))
    .filter(
      (edge): edge is { source: string; target: string; raw: GraphEdgeRecord } =>
        Boolean(edge.source && edge.target),
    );
}

function asRecordArray(value: unknown): GraphNodeRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      isRecord(item) ? [{ ...item, id: stringValue(item.id) ?? key }] : [],
    );
  }

  return [];
}

function toMatch(node: { id: string; raw: GraphNodeRecord }, score: number): CodeGraphMatch {
  return {
    id: node.id,
    label: labelFor(node),
    type: nullableString(node.raw.type ?? node.raw.kind ?? node.raw.node_type),
    score,
    sourceLocation: sourceCandidates(node.raw)[0] ?? null,
    summary: nullableString(
      node.raw.summary ?? node.raw.description ?? node.raw.docstring ?? node.raw.content,
    ),
  };
}

function toEdge(edge: { source: string; target: string; raw: GraphEdgeRecord }): CodeGraphEdge {
  return {
    source: edge.source,
    target: edge.target,
    type: nullableString(edge.raw.type ?? edge.raw.label ?? edge.raw.relation),
    sourceLocation: sourceCandidates(edge.raw)[0] ?? null,
  };
}

function scoreNode(node: { id: string; raw: GraphNodeRecord }, query: string, tokens: string[]): number {
  if (!tokens.length) {
    return 0;
  }

  const label = normalize(labelFor(node));
  const id = normalize(node.id);
  const source = normalize(sourceCandidates(node.raw).join(' '));
  const fullText = normalize(
    [
      node.id,
      labelFor(node),
      node.raw.type,
      node.raw.kind,
      node.raw.summary,
      node.raw.description,
      node.raw.docstring,
      node.raw.content,
      sourceCandidates(node.raw).join(' '),
    ]
      .filter(Boolean)
      .join(' '),
  );
  const normalizedQuery = normalize(query);
  let score = fullText.includes(normalizedQuery) ? 10 : 0;

  for (const token of tokens) {
    if (label.includes(token)) score += 5;
    if (id.includes(token)) score += 3;
    if (source.includes(token)) score += 2;
    if (fullText.includes(token)) score += 1;
  }

  return score;
}

function labelFor(node: { id: string; raw: GraphNodeRecord }): string {
  return stringValue(node.raw.label ?? node.raw.name ?? node.raw.title) ?? node.id;
}

function sourceCandidates(record: GraphNodeRecord): string[] {
  const sourceFile = stringValue(record.source_file ?? record.sourceFile);
  const sourceLine = stringValue(record.source_location ?? record.sourceLocation);
  const combinedSource =
    sourceFile && sourceLine && !sourceLine.includes(sourceFile)
      ? `${sourceFile}:${sourceLine}`
      : undefined;

  return [
    combinedSource,
    record.source_location,
    record.sourceLocation,
    record.location,
    combinedSource ? undefined : record.source_file,
    combinedSource ? undefined : record.sourceFile,
    record.path,
    record.file,
  ]
    .map(stringValue)
    .filter((value): value is string => Boolean(value));
}

function isUnsafeSource(sourceLocation: string): boolean {
  const normalized = sourceLocation.replaceAll('\\', '/').replace(/^file:\/\//, '');
  return UNSAFE_SOURCE_PATTERNS.some(pattern => pattern.test(normalized));
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9_./-]+/i)
    .map(token => token.trim())
    .filter(token => token.length >= 2);
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

function clampLimit(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value)));
}

function nullableString(value: unknown): string | null {
  return stringValue(value) ?? null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
