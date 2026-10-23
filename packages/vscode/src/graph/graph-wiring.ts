import * as vscode from 'vscode';

import type { GraphContext, GraphDetails, GraphWiring } from './common/graph-panel.type.ts';
import { editorGraphCommandPorts } from './data-access/graph-command-ports.ts';
import { editorGraphHost } from './data-access/graph-ports.ts';
import { GraphPanels } from './domain-logic/graph-panels.ts';
import { registerGraph } from './feature/register-graph.ts';
import type { PanelKey } from '../details/common/details.type.ts';
import type { PanelRoots } from '../roots/common/panel-roots.type.ts';
import type { Runs } from '../run/common/run.type.ts';
import { manifestFile, rootOf } from '../run/feature/register-pickers.ts';
import type { Output } from '../shared/common/output.type.ts';

/**
 * The graph panels over the root session, wired as `createPanels` wires Details; a panel reports its visibility to the
 * session only through the `setPanelVisible` closure here. It sits beside the layers, like `extension.ts`, because it
 * joins `data-access` to `feature`.
 */
export const createGraph = (
  context: GraphContext,
  session: PanelRoots,
  details: GraphDetails,
  output: Output,
  runs: Runs
  // eslint-disable-next-line max-params -- the wiring inputs plus the run store `extension.ts` passes
): GraphWiring => {
  const setPanelVisible = (root: string, panelId: string, visible: boolean): void => {
    session.setPanelVisible(root, panelId, visible);
  };
  const openDetails = async (key: PanelKey): Promise<void> => {
    await details.open(key);
  };
  const host = editorGraphHost(context.extensionUri, output, context.workspaceState);
  const panels = new GraphPanels({ roots: session.store, host, setPanelVisible, openDetails, runs });
  const ports = editorGraphCommandPorts(manifestFile, rootOf, output.error);
  const wiring: GraphWiring = {
    api: panels.api(),
    pruneRoots: () => {
      panels.pruneRoots();
    },
    register: () => registerGraph(panels, session.store, ports, vscode.commands.registerCommand)
  };

  return wiring;
};
