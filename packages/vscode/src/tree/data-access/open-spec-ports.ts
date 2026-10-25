import * as vscode from 'vscode';

import type { OpenSpecPorts } from '../common/open-spec.type.ts';

/** The editor effects of Open Spec: the text editor and an error message. */
export const editorOpenSpecPorts = (): OpenSpecPorts => {
  const ports: OpenSpecPorts = {
    open: async (file) => {
      await vscode.window.showTextDocument(vscode.Uri.file(file));
    },
    error: (text) => {
      void vscode.window.showErrorMessage(text);
    }
  };

  return ports;
};
