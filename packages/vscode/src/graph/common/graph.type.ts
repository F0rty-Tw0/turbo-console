import type { GraphHostMessage } from '@turbo-console/webview-ui';

import type { GraphLayoutCacheEntry } from './graph-cache.type.ts';

/** Editor effects of one graph panel. `openDetails` may reject; `log` (failures) and `info` take one clean line and must not throw. */
export type GraphPorts = {
  readonly post: (message: GraphHostMessage) => void;
  readonly readCache: (root: string) => GraphLayoutCacheEntry | null;
  readonly writeCache: (root: string, entry: GraphLayoutCacheEntry) => void;
  readonly openDetails: (packageName: string) => Promise<void>;
  readonly setPanelVisible: (visible: boolean) => void;
  readonly log: (text: string) => void;
  readonly info: (text: string) => void;
};
