export const SHELL_ORIGIN = 'https://graph-ui.test';

export const SHELL_URL = `${SHELL_ORIGIN}/index.html`;

/** Inline script with no nonce; the webview CSP must block it. */
export const UNNONCED_SCRIPT = '<script>window.__ran = true</script>';

/** Init script: records every CSP violation in `window.__violations` before the page parses. */
export const VIOLATION_RECORDER = `window.__violations = [];
document.addEventListener('securitypolicyviolation', (event) => window.__violations.push(event.violatedDirective));`;
