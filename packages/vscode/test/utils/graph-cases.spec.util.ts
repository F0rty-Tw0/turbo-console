import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { lastGraphState } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import { GRAPH_COMMAND, HASH_PATTERN, ROOT_PACKAGE_NAME } from '../common/graph.const.ts';
import type { GraphScene, PackageGraphHostState } from '../common/graph.type.ts';
import type { ShownManifest, ShownPackage } from '../common/launch.type.ts';

const CLOSE_EDITOR_COMMAND = 'workbench.action.closeActiveEditor';

const sorted = (names: string[]): string[] => names.toSorted();

const requireState = (scene: GraphScene): PackageGraphHostState => {
  const { api, root } = scene;
  const state = lastGraphState(api, root);

  if (state === null) throw new Error('no graph state was posted');

  return state;
};

const positionedNamesOf = (state: PackageGraphHostState): string[] => {
  if (state.positions === null) return [];

  return Object.keys(state.positions);
};

/** The packages the graph draws: all but the atom definitions packages, which the model hides as the tree does. */
const shownPackagesOf = (manifest: ShownManifest): ShownPackage[] =>
  manifest.packages.filter((pkg) => pkg.role !== 'atom-definitions');

/** The shown packages' dependency pairs that join two shown packages, as the host's deduped edges name them. */
const expectedEdgesOf = (manifest: ShownManifest): string[] => {
  const shown = shownPackagesOf(manifest);
  const names = new Set(shown.map((pkg) => pkg.name));
  const lines: string[] = [];

  for (const pkg of shown) {
    for (const dependency of pkg.dependencies) {
      const isWorkspaceDependency = names.has(dependency);

      if (isWorkspaceDependency) lines.push(`${pkg.name}>${dependency}`);
    }
  }

  return lines;
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
    const packages = state.packages.filter((name) => name !== ROOT_PACKAGE_NAME);
    const manifestNames = shownPackagesOf(manifest).map((pkg) => pkg.name);
    const edgeLines = state.edges.map((edge) => `${edge.source}>${edge.target}`);

    assert.equal(api.graph.panels().length, 1);
    assert.deepEqual(panel, { root, visible: true });
    assert.deepEqual(sorted(packages), sorted(manifestNames));

    for (const line of expectedEdgesOf(manifest)) assert.ok(edgeLines.includes(line), `edge ${line} is drawn`);

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
    const isOpened = (): boolean => api.details.panels().some((panel) => panel.root === root && panel.packageName === name);

    await api.graph.receive(root, { type: 'openDetails', packageName: name });
    await waitFor('details panel', isOpened);
    await api.details.whenIdle(root, name);
  });
};
