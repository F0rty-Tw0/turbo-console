import assert from 'node:assert/strict';

import type { GraphEdge, GraphReady } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { lastGraphState } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { PanelInfo } from '../../src/shared/common/api.type.ts';
import { GRAPH_COMMAND, HASH_PATTERN, ROOT_PACKAGE_NAME } from '../common/graph.const.ts';
import type { GraphScene } from '../common/graph.type.ts';
import type { ShownManifest, ShownPackage } from '../common/launch.type.ts';

const CLOSE_EDITOR_COMMAND = 'workbench.action.closeActiveEditor';

const sorted = (names: string[]): string[] => names.toSorted();

const requireState = (scene: GraphScene): GraphReady => {
  const { api, root } = scene;
  const state = lastGraphState(api, root);

  if (state === null) throw new Error('no graph state was posted');

  return state;
};

const positionedNamesOf = (state: GraphReady): string[] => {
  if (state.positions === null) return [];

  return Object.keys(state.positions);
};

const isShown = (pkg: ShownPackage): boolean => pkg.role !== 'atom-definitions';

/** The packages the graph draws: all but the atom definitions packages, which the model hides as the tree does. */
const shownPackagesOf = (manifest: ShownManifest): ShownPackage[] => manifest.packages.filter(isShown);

const edgeLineOf = (edge: GraphEdge): string => `${edge.source}>${edge.target}`;

/** The shown packages' dependency pairs that join two shown packages, each once and sorted, as the host's deduped edges name them. */
const expectedEdgesOf = (manifest: ShownManifest): string[] => {
  const shown = shownPackagesOf(manifest);
  const names = new Set(shown.map((pkg): string => pkg.name));
  const lines = new Set<string>();

  for (const pkg of shown) {
    for (const dependency of pkg.dependencies) {
      const isWorkspaceDependency = names.has(dependency);

      if (isWorkspaceDependency) lines.add(`${pkg.name}>${dependency}`);
    }
  }

  return sorted([...lines]);
};

/** Opening twice keeps one shown panel; its graph holds every manifest package and every edge between them. */
export const openCase = async (scene: GraphScene): Promise<void> => {
  const { api, root, manifest } = scene;

  await step('L13-1: the command opens one panel with every package and edge', async () => {
    await vscode.commands.executeCommand(GRAPH_COMMAND);
    await vscode.commands.executeCommand(GRAPH_COMMAND);
    await waitFor('graph state', () => lastGraphState(api, root) !== null);

    const state = requireState(scene);
    const [panel] = api.graph.panels();
    const packages = state.packages.filter((name): boolean => name !== ROOT_PACKAGE_NAME);
    const manifestNames = shownPackagesOf(manifest).map((pkg): string => pkg.name);
    const edgeLines = state.edges.map(edgeLineOf);

    assert.equal(api.graph.panels().length, 1);
    assert.deepEqual(panel, { root, visible: true });
    assert.deepEqual(sorted(packages), sorted(manifestNames));
    assert.deepEqual(sorted(edgeLines), expectedEdgesOf(manifest));

    assert.equal(state.positions, null);
    assert.match(state.hash, HASH_PATTERN);
  });
};

/** The page posts its ELK positions once; the host caches them under the graph hash and a reopened panel gets them. */
export const cacheCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-2: the layout is cached and the reopened panel gets it', async () => {
    const { hash: firstHash } = requireState(scene);
    const hasPositions = (): boolean => {
      const last = lastGraphState(api, root);

      return last !== null && last.positions !== null;
    };

    await waitFor('cached hash', () => api.graph.cachedHash(root) === firstHash);
    await vscode.commands.executeCommand(CLOSE_EDITOR_COMMAND);
    await waitFor('panel closed', () => api.graph.panels().length === 0);
    await vscode.commands.executeCommand(GRAPH_COMMAND);
    await waitFor('state with cached positions', hasPositions);

    const state = requireState(scene);
    const positioned = positionedNamesOf(state);

    assert.equal(state.hash, firstHash);
    assert.deepEqual(sorted(positioned), sorted(state.packages));
  });
};

/** A page `openDetails` message opens that package's Details panel. */
export const detailsCase = async (scene: GraphScene): Promise<void> => {
  const { api, root, manifest } = scene;

  await step("L13-3: openDetails opens that package's Details panel", async () => {
    const [first] = shownPackagesOf(manifest);

    if (first === undefined) throw new Error('the fixture manifest has no shown package');

    const { name } = first;
    const isPanelOf = (panel: PanelInfo): boolean => panel.root === root && panel.packageName === name;
    const isOpened = (): boolean => api.details.panels().some(isPanelOf);

    await api.graph.receive(root, { type: 'openDetails', packageName: name });
    await waitFor('details panel', isOpened);
    await api.details.whenIdle(root, name);
  });
};
