import type * as vscode from 'vscode';

import type { EditorPanelView } from '../common/panel-view.type.ts';

/** The registry-facing view of an editor panel, posting messages of type `TMessage`. */
export const panelViewOf = <TMessage>(panel: vscode.WebviewPanel): EditorPanelView<TMessage> => {
  const view: EditorPanelView<TMessage> = {
    isVisible: () => panel.visible,
    reveal: () => {
      panel.reveal();
    },
    setTitle: (title) => {
      panel.title = title;
    },
    send: (message) => panel.webview.postMessage(message),
    onMessage: (listener) => {
      panel.webview.onDidReceiveMessage(listener);
    },
    onViewState: (listener) => {
      panel.onDidChangeViewState(() => {
        listener();
      });
    },
    onDispose: (listener) => {
      panel.onDidDispose(listener);
    },
    dispose: () => {
      panel.dispose();
    }
  };

  return view;
};
