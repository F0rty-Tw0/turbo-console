import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readDryRun } from '@turbo-console/core';
import * as vscode from 'vscode';

import type { Output } from '../../shared/common/output.type.ts';
import { DETAILS_ASSET_DIR, DETAILS_VIEW_TYPE } from '../common/details.const.ts';
import type { PanelHost, PanelView } from '../common/panel.type.ts';
import { detailsHtml, panelOptionsOf } from '../utils/details-webview.util.ts';

const NONCE_BYTES = 16;

/** A new nonce for one html assignment. */
const freshNonce = (): string => randomBytes(NONCE_BYTES).toString('base64');

const viewOf = (panel: vscode.WebviewPanel): PanelView => {
  const view: PanelView = {
    isVisible: () => panel.visible,
    reveal: () => {
      panel.reveal();
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

/** Sets the page on a new panel with a fresh nonce; a page that cannot be built disposes the panel and throws. */
const setHtml = (panel: vscode.WebviewPanel, assetRoot: vscode.Uri): void => {
  const { webview } = panel;
  const uriOf = (name: string): string => webview.asWebviewUri(vscode.Uri.joinPath(assetRoot, name)).toString();

  try {
    const template = readFileSync(join(assetRoot.fsPath, 'index.html'), 'utf8');

    webview.html = detailsHtml(template, { cspSource: webview.cspSource, uriOf }, freshNonce());
  } catch (error: unknown) {
    panel.dispose();

    throw error;
  }
};

/** The editor effects of Package Details: panels over `createWebviewPanel`, `readDryRun`, commands and the output channel. */
export const editorPanelHost = (extensionUri: vscode.Uri, output: Output, rootOf: PanelHost['rootOf']): PanelHost => {
  const assetRoot = vscode.Uri.joinPath(extensionUri, ...DETAILS_ASSET_DIR);
  const options = panelOptionsOf(assetRoot);
  const open = (title: string): PanelView => {
    const panel = vscode.window.createWebviewPanel(DETAILS_VIEW_TYPE, title, vscode.ViewColumn.Active, options);

    setHtml(panel, assetRoot);

    return viewOf(panel);
  };
  const host: PanelHost = {
    open,
    rootOf,
    dryRun: async (binary, request, signal) => readDryRun(binary, request, { signal }),
    execute: async (command, arg) => {
      await vscode.commands.executeCommand(command, arg);
    },
    info: (text) => {
      void vscode.window.showInformationMessage(text);
    },
    error: (text) => {
      void vscode.window.showErrorMessage(text);
    },
    log: output.error
  };

  return host;
};
