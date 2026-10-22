import type { PackageEdge, PackageNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphEdge, GraphPackage, GraphState, Positions } from '@turbo-console/webview-ui';

import { coversExactly } from './graph-cache.util.ts';
import { packageNamesOf } from './graph-package.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { binaryMessageOf, shownModelOf } from '../../tree/utils/root-rows.util.ts';
import { isVisibleTask } from '../../tree/utils/task-filter.util.ts';
import type { GraphLayoutCacheEntry, GraphLayoutCaches } from '../common/graph-cache.type.ts';

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const KEY_SEPARATOR = '\0';
const SINGLE_PACKAGE: GraphState = { kind: 'singlePackage' };
const LOAD_KIND = 'load-no-model';
const LOADING: GraphState = { kind: 'loading' };

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;

  return left > right ? 1 : 0;
};

const compareEdges = (left: GraphEdge, right: GraphEdge): number =>
  compareText(left.source, right.source) || compareText(left.target, right.target);

const comparePackages = (left: GraphPackage, right: GraphPackage): number => compareText(left.name, right.name);

const fnv1a = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let hash = FNV_OFFSET;

  for (const byte of bytes) hash = Math.imul(hash ^ byte, FNV_PRIME) >>> 0;

  return hash.toString(16).padStart(8, '0');
};

/**
 * FNV-1a over a `[name, path, tags]` JSON line per package in name order, a blank line, then a `[source, target]` JSON line per edge
 * in sorted order, so input order never matters but a changed path or tag does. Tags are hashed in the order given: `graphStateOf`
 * sorts them first.
 */
export const graphHashOf = (packages: GraphPackage[], edges: GraphEdge[]): string => {
  const packageLines = packages.toSorted(comparePackages).map((pkg) => JSON.stringify([pkg.name, pkg.path, pkg.tags]));
  const lines = edges.toSorted(compareEdges).map((edge) => JSON.stringify([edge.source, edge.target]));
  const text = `${packageLines.join('\n')}\n\n${lines.join('\n')}`;

  return fnv1a(text);
};

/** The name, the path, the tags (deduplicated and sorted) and the visible task count of a node; only the first three are hashed. */
const packageOf = (node: PackageNode): GraphPackage => {
  const tags = Array.from(new Set(node.tags)).toSorted(compareText);
  const taskCount = node.tasks.filter(isVisibleTask).length;
  const info: GraphPackage = { name: node.name, path: node.path, tags, taskCount };

  return info;
};

/** `kind` dropped, pairs deduped, sorted by source then target. */
const edgesOf = (modelEdges: PackageEdge[]): GraphEdge[] => {
  const byPair = new Map<string, GraphEdge>();

  for (const { source, target } of modelEdges) byPair.set(`${source}${KEY_SEPARATOR}${target}`, { source, target });

  return Array.from(byPair.values()).toSorted(compareEdges);
};

/** The cached positions when the entry is for this exact graph: the same hash and a point for exactly its packages. */
const cachedPositionsOf = (cache: GraphLayoutCacheEntry | null, hash: string, packages: string[]): Positions | null => {
  if (cache?.hash !== hash) return null;

  return coversExactly(cache.positions, packages) ? cache.positions : null;
};

export const graphStateOf = (model: WorkspaceModel, caches: GraphLayoutCaches): GraphState => {
  if (model.singlePackage) return SINGLE_PACKAGE;

  const packages = model.packages.map(packageOf).toSorted(comparePackages);
  const edges = edgesOf(model.edges);
  const hash = graphHashOf(packages, edges);
  const names = packageNamesOf(packages);
  const positions = cachedPositionsOf(caches.flat, hash, names);
  const folderPositions = cachedPositionsOf(caches.folders, hash, names);
  const state: GraphState = { kind: 'graph', hash, packages, edges, positions, folderPositions };

  return state;
};

/** A root's state as the page sees it. Fixed texts only, never the failure's own message. */
export const graphStateOfRoot = (state: RootState | undefined, caches: GraphLayoutCaches): GraphState => {
  if (state === undefined) return LOADING;

  const model = shownModelOf(state);

  if (model !== null) return graphStateOf(model, caches);

  if (state.error === null) return LOADING;

  const { stage, error } = state.error;
  const binaryKind = binaryMessageOf(error.kind);
  const kind = stage === 'binary' ? binaryKind : LOAD_KIND;
  const failed: GraphState = { kind: 'error', message: MESSAGE_TEXTS[kind] };

  return failed;
};
