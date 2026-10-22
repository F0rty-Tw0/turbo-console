/**
 * Runs in the page through `evaluate`: posts each state as the host does, in order, within one task. `json` holds the
 * states as JSON, since the `evaluate` argument drops an own `__proto__` key that `JSON.parse` and `postMessage` keep.
 */
export const postStates = (json: string): void => {
  const parsed: unknown = JSON.parse(json);

  if (!Array.isArray(parsed)) throw new TypeError('postStates expects a JSON array of states');

  const states: unknown[] = parsed;

  for (const state of states) window.postMessage({ type: 'state', state }, '*');
};

/** Runs in the page through `evaluate`: posts one host reply, sent as JSON for the same reason, to the page's message listener. */
export const postReply = (json: string): void => {
  const reply: unknown = JSON.parse(json);

  window.postMessage(reply, '*');
};
