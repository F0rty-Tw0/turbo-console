import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as vscode from 'vscode';

import type { HtmlBuilder } from '../common/html-assets.type.ts';

const NONCE_BYTES = 16;

/** A new nonce for one html assignment. */
const freshNonce = (): string => randomBytes(NONCE_BYTES).toString('base64');

/** Sets the page on a new panel with a fresh nonce; a page that cannot be built disposes the panel and throws. */
export const setPanelHtml = (panel: vscode.WebviewPanel, assetRoot: vscode.Uri, build: HtmlBuilder): void => {
  const { webview } = panel;
  const uriOf = (name: string): string => webview.asWebviewUri(vscode.Uri.joinPath(assetRoot, name)).toString();

  try {
    const template = readFileSync(join(assetRoot.fsPath, 'index.html'), 'utf8');

    webview.html = build(template, { cspSource: webview.cspSource, uriOf }, freshNonce());
  } catch (error: unknown) {
    panel.dispose();

    throw error;
  }
};
