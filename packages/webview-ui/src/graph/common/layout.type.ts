import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { Positions } from '../../bridge/common/graph-state.type.ts';

export type ElkLike = {
  readonly layout: (graph: ElkNode) => Promise<ElkNode>;
  /** Replaces the single listener; called with the worker `error` event's message. */
  readonly onError: (listener: (message: string) => void) => void;
  /** Terminates the worker and revokes its blob URL. */
  readonly terminate: () => void;
};

export type LayoutRunnerDeps = {
  readonly createElk: () => ElkLike;
  readonly timeoutMs: number;
  readonly fallback: (graph: ElkNode) => Positions;
};

export type LayoutResult = {
  readonly hash: string;
  readonly positions: Positions;
  readonly engine: 'elk' | 'fallback';
  readonly ms: number;
};

export type LayoutRunner = {
  /** Resolves `null` when a newer run started before this one settled. */
  readonly run: (hash: string, graph: ElkNode) => Promise<LayoutResult | null>;
};
