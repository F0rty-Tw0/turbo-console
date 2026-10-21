import type { GraphState, Positions } from './graph-state.type.ts';

export type GraphHostMessage = {
  readonly type: 'state';
  readonly state: GraphState;
};

type GraphReadyMessage = { readonly type: 'ready' };

type GraphReloadMessage = { readonly type: 'reload' };

type GraphOpenDetailsMessage = {
  readonly type: 'openDetails';
  readonly packageName: string;
};

type GraphPositionsMessage = {
  readonly type: 'positions';
  readonly hash: string;
  readonly positions: Positions;
};

type GraphLayoutDoneMessage = {
  readonly type: 'layoutDone';
  readonly ms: number;
  readonly engine: 'elk' | 'fallback';
};

/** Webview to host. The webview is a trust boundary: the host validates every message. */
export type GraphWebviewMessage =
  GraphReadyMessage | GraphReloadMessage | GraphOpenDetailsMessage | GraphPositionsMessage | GraphLayoutDoneMessage;
