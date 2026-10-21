import type { Positions } from '@turbo-console/webview-ui';

/** One root's cached layout: the positions are valid only for the graph that hashes to `hash`. */
export type GraphLayoutCacheEntry = {
  readonly hash: string;
  readonly positions: Positions;
};
