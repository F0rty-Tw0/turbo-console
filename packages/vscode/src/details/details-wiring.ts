import type * as vscode from 'vscode';

import type { PanelsDeps } from './common/panel.type.ts';
import { editorPanelHost } from './data-access/details-ports.ts';
import { DetailsPanels } from './domain-logic/details-panels.ts';
import type { PanelRoots } from '../roots/common/panel-roots.type.ts';
import { rootOf } from '../run/feature/register-pickers.ts';
import type { Output } from '../shared/common/output.type.ts';

/**
 * The details panels over the root session; a panel reports its visibility to the session only through this closure.
 * It sits beside the layers, like `extension.ts`, because it joins `data-access` to `feature`.
 */
export const createPanels = (
  context: vscode.ExtensionContext,
  session: PanelRoots,
  shared: Pick<PanelsDeps, 'runs' | 'scripts'>,
  output: Output
): DetailsPanels => {
  const setPanelVisible: PanelsDeps['setPanelVisible'] = (root, panelId, visible) => {
    session.setPanelVisible(root, panelId, visible);
  };
  const host = editorPanelHost(context.extensionUri, output, rootOf);

  return new DetailsPanels({ roots: session.store, ...shared, host, setPanelVisible });
};
