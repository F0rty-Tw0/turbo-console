/** Init script: stands in for a webview state VS Code kept, which the host stub's `getState` hands to the page. */
export const savedStateScript = (raw: unknown): string => `window.__state = ${JSON.stringify(raw)};`;
