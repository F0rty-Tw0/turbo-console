export const SHELL_ORIGIN = 'https://webview-ui.test';

export const SHELL_URL = `${SHELL_ORIGIN}/index.html`;

/** Inline script with no nonce; the webview CSP must block it. */
export const UNNONCED_SCRIPT = '<script>window.__ran = true</script>';

/** Writes an HTML string to a fresh element's `innerHTML`; evaluates to the thrown error's name, else `'none'`. */
export const STRING_SINK_PROBE = `(() => {
  try {
    document.createElement('div').innerHTML = '<b>x</b>';

    return 'none';
  } catch (error) {
    return error.name;
  }
})()`;

/** Init script: records every CSP violation in `window.__violations` before the page parses. */
export const VIOLATION_RECORDER = `window.__violations = [];
document.addEventListener('securitypolicyviolation', (event) => window.__violations.push(event.violatedDirective));`;

/** Init script, after `page.clock.install`: keeps the ids of the page's live `setInterval` timers in `window.__intervals`. */
export const INTERVAL_RECORDER = `window.__intervals = new Set();
const setTimer = window.setInterval;
const clearTimer = window.clearInterval;
window.setInterval = (...args) => {
  const id = setTimer(...args);
  window.__intervals.add(id);
  return id;
};
window.clearInterval = (id) => {
  window.__intervals.delete(id);
  clearTimer(id);
};`;

/**
 * Init script: stands in for the VS Code host, recording every posted message in `window.__posted`, its
 * `performance.now()` in `window.__postedAt`, and keeping the `setState` value in `window.__state` for `getState`. It
 * leaves `window.__state` alone, so an earlier init script can stand in for a state VS Code kept.
 */
export const HOST_API_STUB = `window.__posted = [];
window.__postedAt = [];
window.acquireVsCodeApi = () => ({
  postMessage: (message) => {
    window.__posted.push(message);
    window.__postedAt.push(performance.now());
  },
  getState: () => window.__state,
  setState: (state) => { window.__state = state; }
});`;

const IS_CODICON_FACE = `(face) => face.family.replaceAll('"', '') === 'codicon'`;

/** `document.fonts.check('16px codicon')` is also true when no codicon face exists at all, so look for a loaded face. */
export const CODICON_LOADED = `document.fonts.check('16px codicon')
  && [...document.fonts].find(${IS_CODICON_FACE})?.status === 'loaded'`;

/** The codicon face's load status; `undefined` when the page declares no codicon face. */
export const CODICON_STATUS = `[...document.fonts].find(${IS_CODICON_FACE})?.status`;
