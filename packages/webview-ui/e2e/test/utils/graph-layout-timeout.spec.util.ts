/** Init script: sets the page's ELK timeout to `ms` in place of the production `FALLBACK_TIMEOUT_MS`. */
export const layoutTimeoutScript = (ms: number): string => `window.__tcLayoutTimeoutMs = ${ms};`;
