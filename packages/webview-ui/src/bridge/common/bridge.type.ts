import type { WebviewMessage } from './details-message.type.ts';

/** Receives the `data` of every message event the host posts to the page. */
export type MessageListener = (message: unknown) => void;

/** What the webview does with the extension host: send messages, receive messages, keep its scroll across a rebuild. */
export type Bridge = {
  readonly ready: () => void;
  readonly post: (message: WebviewMessage) => void;
  readonly onMessage: (listener: MessageListener) => void;
  readonly scrollY: () => number;
  readonly saveScroll: (y: number) => void;
};

/** What the page keeps in the webview `getState`/`setState` store. */
export type ScrollState = {
  readonly scrollY: number;
};

/** Signature of the VS Code webview `postMessage`. */
export type PostMessage = (message: unknown) => void;

/** The part of the VS Code webview API that webview-ui uses. */
export type VsCodeApi = {
  readonly postMessage: PostMessage;
  readonly getState: () => unknown;
  readonly setState: (state: unknown) => void;
};

declare global {
  /** Injected by VS Code into webviews; absent in a plain browser. */
  function acquireVsCodeApi(): VsCodeApi;
}
