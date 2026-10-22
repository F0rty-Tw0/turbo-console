import type { LayoutGrouping, Positions } from '@turbo-console/webview-ui';

/** One root's cached layout: the positions are valid only for the graph that hashes to `hash`. */
export type GraphLayoutCacheEntry = {
  readonly hash: string;
  readonly positions: Positions;
};

/** The two layout caches of one root: the flat graph's and the one grouped by folder. */
export type GraphLayoutCaches = {
  readonly flat: GraphLayoutCacheEntry | null;
  readonly folders: GraphLayoutCacheEntry | null;
};

/** A parsed `positions` post: the page's layout for the graph that hashes to `hash`, in one grouping. */
export type PositionsPost = {
  readonly hash: string;
  readonly positions: Positions;
  readonly grouping: LayoutGrouping;
};
