import { join } from 'node:path';

import type { EdgeExplainResult, GraphEdge, GraphEdgeExplainedMessage, GraphPackage, GraphReady } from '@turbo-console/webview-ui';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { ExplainContext, ExplainRequest } from '../common/graph.type.ts';
import { manifestEntriesOf } from '../utils/manifest-entries.util.ts';

const MANIFEST_FILE = 'package.json';

type ManifestFiles = {
  readonly shown: string;
  readonly absolute: string;
};

/** `shown` is the manifest's path under the workspace root as the page names it; `absolute` is the file to read. */
const manifestFilesOf = (root: string, pkg: GraphPackage): ManifestFiles => {
  const isRootPackage = pkg.path === '';
  const shown = isRootPackage ? MANIFEST_FILE : `${pkg.path}/${MANIFEST_FILE}`;
  const absolute = join(root, pkg.path, MANIFEST_FILE);
  const files: ManifestFiles = { shown, absolute };

  return files;
};

const packagesByName = (state: GraphReady): Map<string, GraphPackage> => {
  const byName = new Map<string, GraphPackage>();

  for (const pkg of state.packages) byName.set(pkg.name, pkg);

  return byName;
};

const hasEdge = (edges: GraphEdge[], source: string, target: string): boolean => {
  const isEdge = (edge: GraphEdge): boolean => edge.source === source && edge.target === target;

  return edges.some(isEdge);
};

/** The failure of a read is logged and counts as an unreadable file. */
const textOf = async (context: ExplainContext, absolute: string): Promise<string | null> => {
  try {
    return await context.ports.readText(absolute);
  } catch (error: unknown) {
    context.ports.log(logTextOf(error));

    return null;
  }
};

const resultOf = (text: string | null, shown: string, target: string): EdgeExplainResult => {
  const unreadable: EdgeExplainResult = { kind: 'unreadable', file: shown };

  if (text === null) return unreadable;

  const entries = manifestEntriesOf(text, target);

  if (entries === null) return unreadable;

  if (entries.length === 0) {
    const missing: EdgeExplainResult = { kind: 'missing', file: shown };

    return missing;
  }

  const found: EdgeExplainResult = { kind: 'found', file: shown, entries };

  return found;
};

const explain = async (source: string, target: string, state: GraphReady, context: ExplainContext): Promise<boolean> => {
  const pkg = packagesByName(state).get(source);
  const isListedEdge = hasEdge(state.edges, source, target);

  if (pkg === undefined || !isListedEdge) return false;

  const { shown, absolute } = manifestFilesOf(context.root, pkg);
  const text = await textOf(context, absolute);
  const result = resultOf(text, shown, target);
  const reply: GraphEdgeExplainedMessage = { type: 'edgeExplained', source, target, result };
  const canPost = context.canPost();

  if (canPost) context.ports.post(reply);

  return true;
};

const openManifest = async (packageName: string, line: number, state: GraphReady, context: ExplainContext): Promise<boolean> => {
  const pkg = packagesByName(state).get(packageName);

  if (pkg === undefined) return false;

  const { absolute } = manifestFilesOf(context.root, pkg);
  const text = await textOf(context, absolute);

  if (text === null) {
    context.ports.log(logTextOf(`Not a readable package.json: ${absolute}`));

    return true;
  }

  try {
    await context.ports.openAt(absolute, line);
  } catch (error: unknown) {
    context.ports.log(logTextOf(error));
  }

  return true;
};

/**
 * Answers a page request against the graph in `context`: `explainEdge` reads the dependent's `package.json` and posts
 * the `edgeExplained` reply when `canPost` still allows it after the read; `openManifest` opens a listed package's
 * `package.json` at the line once a read shows it is a small regular file. `false` means the request is not for this graph (a state that is not a graph, an unlisted
 * package, a pair with no edge): nothing was read, posted or opened. Names are only ever keys of a `Map`.
 */
export const answerRequest = async (request: ExplainRequest, context: ExplainContext): Promise<boolean> => {
  const { state } = context;

  if (state.kind !== 'graph') return false;

  switch (request.type) {
    case 'explainEdge':
      return explain(request.source, request.target, state, context);
    case 'openManifest':
      return openManifest(request.packageName, request.line, state, context);
  }
};
