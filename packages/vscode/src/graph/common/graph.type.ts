import type { GraphHostMessage, GraphWebviewMessage } from '@turbo-console/webview-ui';

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

type PositionsTag = { readonly type: 'positions' };

type UncheckedPositionsMessage = {
  readonly type: 'positions';
  readonly hash: string;
  readonly positions: unknown;
};

/** A message that passed `graphMessageSchema`: a `positions` record is still unread. */
export type SchemaGraphMessage = Exclude<GraphWebviewMessage, PositionsTag> | UncheckedPositionsMessage;
