import type { GraphHostMessage } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { panelOptionsOf } from '../../details/utils/details-webview.util.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { setPanelHtml } from '../../shared/data-access/panel-html.ts';
import { panelViewOf } from '../../shared/data-access/panel-view.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';
import type { GraphHost, GraphStore } from '../common/graph-panel.type.ts';
import { GRAPH_ASSET_DIR, GRAPH_CACHE_KEY_PREFIX, GRAPH_VIEW_TYPE } from '../common/graph.const.ts';
import { layoutEntryOf } from '../utils/graph-cache.util.ts';
import { graphHtml } from '../utils/graph-webview.util.ts';

/** The editor effects of the Package Graph: panels over `createWebviewPanel`, the layout cache in `workspaceState` and the output channel. */
export const editorGraphHost = (extensionUri: vscode.Uri, output: Output, state: GraphStore): GraphHost => {
  const assetRoot = vscode.Uri.joinPath(extensionUri, ...GRAPH_ASSET_DIR);
  const options = panelOptionsOf(assetRoot);
  const open = (title: string): ReturnType<GraphHost['open']> => {
    const panel = vscode.window.createWebviewPanel(GRAPH_VIEW_TYPE, title, vscode.ViewColumn.Active, options);

    setPanelHtml(panel, assetRoot, graphHtml);

    return panelViewOf<GraphHostMessage>(panel);
  };
  const readCache = (root: string): GraphLayoutCacheEntry | null => layoutEntryOf(state.get(`${GRAPH_CACHE_KEY_PREFIX}${root}`));
  const writeCache = (root: string, entry: GraphLayoutCacheEntry): void => {
    const written = Promise.resolve(state.update(`${GRAPH_CACHE_KEY_PREFIX}${root}`, entry));

    written.catch((error: unknown) => {
      output.error(logTextOf(error));
    });
  };
  const host: GraphHost = { open, readCache, writeCache, log: output.error };

  return host;
};
