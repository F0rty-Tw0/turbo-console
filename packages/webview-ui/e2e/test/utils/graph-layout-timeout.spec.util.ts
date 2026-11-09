/**
 * Init script: sets the page's ELK timeout to `ms` in place of the production `FALLBACK_TIMEOUT_MS`; `undefined` leaves
 * the page on the production timeout, since `layoutTimeoutOf` reads only a finite number above 0.
 */
export const layoutTimeoutScript = (ms: number | undefined): string => `window.__tcLayoutTimeoutMs = ${String(ms)};`;
