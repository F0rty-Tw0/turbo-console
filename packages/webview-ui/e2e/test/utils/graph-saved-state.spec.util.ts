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
