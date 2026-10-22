import type { GraphState } from '@turbo-console/webview-ui';

import type { GraphLayoutCacheEntry, GraphLayoutCaches, PositionsPost } from '../common/graph-cache.type.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { acceptedPositions } from '../utils/graph-cache.util.ts';

/** Both layout caches of `root`, each read once. */
export const layoutCachesOf = (ports: GraphPorts, root: string): GraphLayoutCaches => {
  const flat = ports.readCache(root, 'flat');
  const folders = ports.readCache(root, 'folders');
  const caches: GraphLayoutCaches = { flat, folders };

  return caches;
};

/** Stores a `positions` post under its grouping when `state` accepts it; `false` when it is stale or does not cover exactly the packages. */
export const storePositions = (ports: GraphPorts, root: string, state: GraphState, post: PositionsPost): boolean => {
  const positions = acceptedPositions(state, post);

  if (positions === null) return false;

  const entry: GraphLayoutCacheEntry = { hash: post.hash, positions };

  ports.writeCache(root, post.grouping, entry);

  return true;
};
