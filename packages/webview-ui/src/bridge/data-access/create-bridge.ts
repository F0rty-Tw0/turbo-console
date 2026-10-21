import type { Bridge, MessageListener } from '../common/bridge.type.ts';
import type { WebviewMessage } from '../common/details-message.type.ts';
import type { GraphWebviewMessage } from '../common/graph-message.type.ts';

const onWindowMessage = (listener: MessageListener): void => {
  const forward = (event: MessageEvent): void => listener(event.data);

  addEventListener('message', forward);
};

const createHostBridge = (): Bridge => {
  const api = acquireVsCodeApi();
  const post = (message: WebviewMessage | GraphWebviewMessage): void => api.postMessage(message);
  const ready = (): void => post({ type: 'ready' });
  const savedState = (): unknown => api.getState();
  const saveState = (state: unknown): void => api.setState(state);
  const bridge: Bridge = { ready, post, onMessage: onWindowMessage, savedState, saveState };

  return bridge;
};

const createStubBridge = (): Bridge => {
  const ready = (): void => console.warn('webview-ui: ready (no host)');
  const post = (): void => undefined;
  const savedState = (): unknown => undefined;
  const saveState = (): void => undefined;
  const bridge: Bridge = { ready, post, onMessage: onWindowMessage, savedState, saveState };

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
