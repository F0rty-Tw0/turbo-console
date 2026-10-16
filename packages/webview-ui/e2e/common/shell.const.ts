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

/**
 * Init script: stands in for the VS Code host, recording every posted message in `window.__posted` and keeping the
 * `setState` value in `window.__state` for `getState`. It leaves `window.__state` alone, so an earlier init script can
 * stand in for a state VS Code kept.
 */
export const HOST_API_STUB = `window.__posted = [];
window.acquireVsCodeApi = () => ({
  postMessage: (message) => window.__posted.push(message),
  getState: () => window.__state,
  setState: (state) => { window.__state = state; }
});`;
