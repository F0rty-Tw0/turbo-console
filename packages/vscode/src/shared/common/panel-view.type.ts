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
