/** Messages the webview sends to the extension host. */
export type Bridge = {
  readonly ready: () => void;
};

/** Signature of the VS Code webview `postMessage`. */
export type PostMessage = (message: unknown) => void;

/** The part of the VS Code webview API that graph-ui uses. */
export type VsCodeApi = {
  readonly postMessage: PostMessage;
};

declare global {
  /** Injected by VS Code into webviews; absent in a plain browser. */
  function acquireVsCodeApi(): VsCodeApi;
}
