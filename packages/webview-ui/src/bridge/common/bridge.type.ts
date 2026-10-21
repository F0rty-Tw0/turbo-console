import type { WebviewMessage } from './details-message.type.ts';
import type { GraphWebviewMessage } from './graph-message.type.ts';

/** An object whose keys are read one by one, at the page's trust boundaries. */
export type UnknownRecord = Readonly<Record<string, unknown>>;

/** Receives the `data` of every message event the host posts to the page. */
export type MessageListener = (message: unknown) => void;

/** What the webview does with the extension host: send messages, receive messages, keep a page's state across a rebuild. */
export type Bridge = {
  readonly ready: () => void;
  readonly post: (message: WebviewMessage | GraphWebviewMessage) => void;
  readonly onMessage: (listener: MessageListener) => void;
  readonly savedState: () => unknown;
  readonly saveState: (state: unknown) => void;
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
