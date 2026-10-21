import type { Positions } from '@turbo-console/webview-ui';

/** The fields of a posted `graph` state that a spec reads. */
export type PostedGraph = {
  readonly hash: string;
  readonly packages: string[];
  readonly positions: Positions | null;
};
