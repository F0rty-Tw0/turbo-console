import { readDryRun } from '@turbo-console/core';
import type { HostMessage } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import type { Output } from '../../shared/common/output.type.ts';
import { setPanelHtml } from '../../shared/data-access/panel-html.ts';
import { panelViewOf } from '../../shared/data-access/panel-view.ts';
import { DETAILS_ASSET_DIR, DETAILS_VIEW_TYPE } from '../common/details.const.ts';
import type { PanelHost, PanelView } from '../common/panel.type.ts';
import { detailsHtml, panelOptionsOf } from '../utils/details-webview.util.ts';

/** The editor effects of Package Details: panels over `createWebviewPanel`, `readDryRun`, commands and the output channel. */
export const editorPanelHost = (extensionUri: vscode.Uri, output: Output, rootOf: PanelHost['rootOf']): PanelHost => {
  const assetRoot = vscode.Uri.joinPath(extensionUri, ...DETAILS_ASSET_DIR);
  const options = panelOptionsOf(assetRoot);
  const open = (title: string): PanelView => {
    const panel = vscode.window.createWebviewPanel(DETAILS_VIEW_TYPE, title, vscode.ViewColumn.Active, options);

    setPanelHtml(panel, assetRoot, detailsHtml);

    return panelViewOf<HostMessage>(panel);
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
