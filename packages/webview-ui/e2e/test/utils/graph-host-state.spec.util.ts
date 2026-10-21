import type { GraphState } from '../../../src/bridge/common/graph-state.type.ts';

/** Runs in the page through `evaluate`: posts each state as the host does, in order, within one task. */
export const postStates = (states: GraphState[]): void => {
  for (const state of states) window.postMessage({ type: 'state', state }, '*');
};
