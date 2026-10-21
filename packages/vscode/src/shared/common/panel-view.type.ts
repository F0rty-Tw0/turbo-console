/** One webview panel as a registry drives it. Listeners live as long as the panel; `dispose` is safe to repeat. */
export type EditorPanelView<TMessage> = {
  readonly isVisible: () => boolean;
  readonly reveal: () => void;
  readonly setTitle: (title: string) => void;
  readonly send: (message: TMessage) => PromiseLike<unknown>;
  readonly onMessage: (listener: (value: unknown) => void) => void;
  readonly onViewState: (listener: () => void) => void;
  readonly onDispose: (listener: () => void) => void;
  readonly dispose: () => void;
};

/** What `wirePanel` drives of a panel's session. */
export type WiredSession = {
  readonly receive: (value: unknown) => Promise<void>;
  readonly setVisible: (visible: boolean) => void;
  readonly start: () => void;
};
