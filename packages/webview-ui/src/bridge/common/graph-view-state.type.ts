import type { Position } from './graph-state.type.ts';

/** What the graph page keeps in the webview state: the camera, the selection and the controls panel for one graph hash. */
export type GraphViewState = {
  readonly hash: string;
  readonly zoom: number;
  readonly pan: Position;
  readonly selected: string | null;
  readonly controlsOpen: boolean;
  readonly search: string;
  readonly depth: number;
  readonly hidden: string[];
  readonly focus: string | null;
  readonly tags: string[];
};
