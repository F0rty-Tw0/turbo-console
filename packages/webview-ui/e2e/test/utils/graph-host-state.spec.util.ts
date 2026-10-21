import type { GraphEdgeExplainedMessage } from '../../../src/bridge/common/graph-message.type.ts';
import type { GraphState } from '../../../src/bridge/common/graph-state.type.ts';

/** Runs in the page through `evaluate`: posts each state as the host does, in order, within one task. */
export const postStates = (states: GraphState[]): void => {
  for (const state of states) window.postMessage({ type: 'state', state }, '*');
};

/** Runs in the page through `evaluate`: posts one host reply to the page's message listener. */
export const postReply = (reply: GraphEdgeExplainedMessage): void => {
  window.postMessage(reply, '*');
};
