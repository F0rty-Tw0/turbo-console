import type { Bridge, MessageListener, ScrollState } from '../common/bridge.type.ts';
import type { WebviewMessage } from '../common/details-message.type.ts';
import { readScrollY } from '../utils/scroll-state.util.ts';

const onWindowMessage = (listener: MessageListener): void => {
  const forward = (event: MessageEvent): void => listener(event.data);

  addEventListener('message', forward);
};

const createHostBridge = (): Bridge => {
  const api = acquireVsCodeApi();
  const post = (message: WebviewMessage): void => api.postMessage(message);
  const ready = (): void => post({ type: 'ready' });
  const scrollY = (): number => readScrollY(api.getState());
  const saveScroll = (y: number): void => {
    const state: ScrollState = { scrollY: y };

    api.setState(state);
  };
  const bridge: Bridge = { ready, post, onMessage: onWindowMessage, scrollY, saveScroll };

  return bridge;
};

const createStubBridge = (): Bridge => {
  const ready = (): void => console.warn('webview-ui: ready (no host)');
  const post = (): void => undefined;
  const scrollY = (): number => 0;
  const saveScroll = (): void => undefined;
  const bridge: Bridge = { ready, post, onMessage: onWindowMessage, scrollY, saveScroll };

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
