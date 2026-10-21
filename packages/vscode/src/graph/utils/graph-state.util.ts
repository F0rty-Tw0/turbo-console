import type { PackageEdge, WorkspaceModel } from '@turbo-console/core';
import type { GraphEdge, GraphState, Positions } from '@turbo-console/webview-ui';

import { coversExactly } from './graph-cache.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { binaryMessageOf, shownModelOf } from '../../tree/utils/root-rows.util.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';

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

const fnv1a = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let hash = FNV_OFFSET;

  for (const byte of bytes) hash = Math.imul(hash ^ byte, FNV_PRIME) >>> 0;

  return hash.toString(16).padStart(8, '0');
};

/** FNV-1a over the sorted names and the sorted `source>target` lines, so input order never matters. */
export const graphHashOf = (packages: string[], edges: GraphEdge[]): string => {
  const names = packages.toSorted(compareText);
  const lines = edges.toSorted(compareEdges).map((edge) => `${edge.source}>${edge.target}`);
  const text = `${names.join('\n')}\n\n${lines.join('\n')}`;

  return fnv1a(text);
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

export const graphStateOf = (model: WorkspaceModel, cache: GraphLayoutCacheEntry | null): GraphState => {
  if (model.singlePackage) return SINGLE_PACKAGE;

  const packages = model.packages.map((pkg) => pkg.name).toSorted(compareText);
  const edges = edgesOf(model.edges);
  const hash = graphHashOf(packages, edges);
  const positions = cachedPositionsOf(cache, hash, packages);
  const state: GraphState = { kind: 'graph', hash, packages, edges, positions };

  return state;
};

/** A root's state as the page sees it. Fixed texts only, never the failure's own message. */
export const graphStateOfRoot = (state: RootState | undefined, cache: GraphLayoutCacheEntry | null): GraphState => {
  if (state === undefined) return LOADING;

  const model = shownModelOf(state);

  if (model !== null) return graphStateOf(model, cache);

  if (state.error === null) return LOADING;

  const { stage, error } = state.error;
  const binaryKind = binaryMessageOf(error.kind);
  const kind = stage === 'binary' ? binaryKind : LOAD_KIND;
  const failed: GraphState = { kind: 'error', message: MESSAGE_TEXTS[kind] };

  return failed;
};
