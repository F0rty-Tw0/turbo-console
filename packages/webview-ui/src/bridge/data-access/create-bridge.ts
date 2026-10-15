import type { Bridge } from '../common/bridge.type.ts';

const createHostBridge = (): Bridge => {
  const api = acquireVsCodeApi();
  const ready = (): void => api.postMessage({ type: 'ready' });
  const bridge: Bridge = { ready };

  return bridge;
};

const createStubBridge = (): Bridge => {
  const ready = (): void => console.warn('webview-ui: ready (no host)');
  const bridge: Bridge = { ready };

  return bridge;
};

/**
 * Bridge to the VS Code host when running in a webview; a logging stub in a plain browser.
 * Call once per webview: VS Code throws if `acquireVsCodeApi()` is called a second time.
 */
export const createBridge = (): Bridge => {
  const hasHost = typeof acquireVsCodeApi === 'function';

  if (!hasHost) return createStubBridge();

  return createHostBridge();
};
