export const SHELL_ORIGIN = 'https://webview-ui.test';

export const SHELL_URL = `${SHELL_ORIGIN}/index.html`;

/** Inline script with no nonce; the webview CSP must block it. */
export const UNNONCED_SCRIPT = '<script>window.__ran = true</script>';

/** Init script: records every CSP violation in `window.__violations` before the page parses. */
export const VIOLATION_RECORDER = `window.__violations = [];
document.addEventListener('securitypolicyviolation', (event) => window.__violations.push(event.violatedDirective));`;

/**
 * Init script: stands in for the VS Code host, recording every posted message in `window.__posted` and keeping the
 * `setState` value in `window.__state` for `getState`.
 */
export const HOST_API_STUB = `window.__posted = [];
window.__state = undefined;
window.acquireVsCodeApi = () => ({
  postMessage: (message) => window.__posted.push(message),
  getState: () => window.__state,
  setState: (state) => { window.__state = state; }
});`;
