import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { Positions, Routes } from '../../bridge/common/graph-state.type.ts';

/** ELK layout options, as ELK takes them: every value a string. */
export type ElkOptions = Readonly<Record<string, string>>;

/** How ELK assigns nodes to layers. */
export type ElkLayering = 'NETWORK_SIMPLEX' | 'LONGEST_PATH';

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

/**
 * A titled-row box as ELK laid it out, relative to the centre of its one leaf so it follows that leaf when it moves: the
 * compound's four sides, and the top-left of its title placeholder.
 */
export type BoxFrame = {
  readonly leafId: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly titleX: number;
  readonly titleY: number;
};

/** The frames of the titled-row boxes of a layout, by box id. */
export type BoxFrames = Readonly<Record<string, BoxFrame>>;

export type LayoutResult = {
  readonly hash: string;
  readonly positions: Positions;
  readonly routes: Routes;
  /** The frames of the titled-row boxes; none for the fallback and for package graphs. Never posted to the host. */
  readonly boxFrames: BoxFrames;
  readonly engine: 'elk' | 'fallback';
  readonly ms: number;
};

export type LayoutRunner = {
  /** Resolves `null` when a newer run started before this one settled. */
  readonly run: (hash: string, graph: ElkNode) => Promise<LayoutResult | null>;
};
