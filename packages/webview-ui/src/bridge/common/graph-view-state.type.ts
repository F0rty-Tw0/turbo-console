import type { Position } from './graph-state.type.ts';

/** What the graph page keeps in the webview state: the camera and the selection for one graph hash. */
export type GraphViewState = {
  readonly hash: string;
  readonly zoom: number;
  readonly pan: Position;
  readonly selected: string | null;
};
