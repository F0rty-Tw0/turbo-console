import type { Position } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { freshViewStateOf } from '../../../src/graph/utils/fresh-view-state.util.ts';

/** Init script: stands in for a webview state VS Code kept, which the host stub's `getState` hands to the page. */
export const savedStateScript = (raw: unknown): string => `window.__state = ${JSON.stringify(raw)};`;

/** A saved view of `hash` at its defaults, with Group by folder checked. */
export const groupedSavedState = (hash: string): GraphViewState => {
  const fresh = freshViewStateOf(hash);
  const state: GraphViewState = { ...fresh, grouped: true };

  return state;
};

/** Moves a camera at zoom 1 so the placed boards' boxes sit below the toolbar and between the two panels. */
const FRAMED_PAN: Position = { x: 150, y: 100 };

/** `groupedSavedState(hash)` with the camera framing the placed boards and these fields replaced. */
export const savedWith = (hash: string, overrides: Partial<GraphViewState>): GraphViewState => {
  const grouped = groupedSavedState(hash);
  const state: GraphViewState = { ...grouped, pan: FRAMED_PAN, ...overrides };

  return state;
};
