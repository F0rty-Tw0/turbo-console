import assert from 'node:assert/strict';

import type { TaskKind } from '@turbo-console/repo-gen';
import type { GraphEdge, GraphPackage, GraphReady, GraphRunState } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { lastGraphState, postedRuns, postedShowTasks } from './graph-posted.spec.util.ts';
import { endedRun, startGraphRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { PanelInfo, TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import {
  GRAPH_COMMAND,
  HASH_PATTERN,
  HUB_TAG,
  ROOT_PACKAGE_NAME,
  TASK_GRAPH_COMMAND,
  TASK_ID,
  TASK_PACKAGE
} from '../common/graph.const.ts';
import type { GraphScene } from '../common/graph.type.ts';
import type { ShownManifest, ShownPackage, ShownTask } from '../common/launch.type.ts';

const CLOSE_EDITOR_COMMAND = 'workbench.action.closeActiveEditor';

/** The manifest task kinds turbo's model does not list: the host's `atom-file` filter drops the first, the model never holds the others. */
const UNLISTED_TASK_KINDS = new Set<TaskKind>(['atom-file', 'carrier', 'phantom']);

const sorted = (names: string[]): string[] => names.toSorted();

const packageLineOf = (pkg: GraphPackage): string => JSON.stringify([pkg.name, pkg.path, pkg.tags]);

/** The host's records exactly as sent, one JSON line each, sorted. */
const sentLinesOf = (packages: GraphPackage[]): string[] => packages.map(packageLineOf).toSorted();

const manifestLineOf = (pkg: ShownPackage): string => {
  const unique = new Set(pkg.tags);
  const tags = Array.from(unique).toSorted();

  return JSON.stringify([pkg.name, pkg.path, tags]);
};

/** The manifest's records with their tags deduplicated and sorted, as the host sends them, one JSON line each, sorted. */
const manifestLinesOf = (packages: ShownPackage[]): string[] => packages.map(manifestLineOf).toSorted();

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

const taskCountOf = (pkg: GraphPackage): number => pkg.taskCount;

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
    const shown = shownPackagesOf(manifest);
    const sent = state.packages.filter((pkg): boolean => pkg.name !== ROOT_PACKAGE_NAME);
    const packages = sent.map((pkg): string => pkg.name);
    const manifestNames = shown.map((pkg): string => pkg.name);
    const edgeLines = state.edges.map(edgeLineOf);
    const isListed = (task: ShownTask, pkg: GraphPackage): boolean =>
      task.packageName === pkg.name && !UNLISTED_TASK_KINDS.has(task.kind);
    const visibleCountOf = (pkg: GraphPackage): number => manifest.tasks.filter((task): boolean => isListed(task, pkg)).length;

    assert.equal(api.graph.panels().length, 1);
    assert.deepEqual(panel, { root, visible: true });
    assert.deepEqual(sorted(packages), sorted(manifestNames));
    assert.deepEqual(sorted(edgeLines), expectedEdgesOf(manifest));
    assert.deepEqual(sentLinesOf(sent), manifestLinesOf(shown));
    assert.ok(sent.some((pkg): boolean => pkg.tags.includes(HUB_TAG)));
    assert.deepEqual(sent.map(taskCountOf), sent.map(visibleCountOf));
    assert.ok(sent.some((pkg): boolean => pkg.taskCount > 0));

    assert.equal(state.positions, null);
    assert.equal(state.folderPositions, null);
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
    assert.deepEqual(sorted(positioned), sorted(state.packages.map((pkg): string => pkg.name)));
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

/** `Show Task Graph…` on a task row asks that root's panel to show that one task. */
export const taskGraphCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-6: Show Task Graph on a task row posts showTasks for that task', async () => {
    const node = await taskNodeNamed(api, TASK_PACKAGE, TASK_ID);

    await vscode.commands.executeCommand(TASK_GRAPH_COMMAND, node);
    await waitFor('showTasks post', () => postedShowTasks(api, root) !== null);

    assert.deepEqual(postedShowTasks(api, root), { type: 'showTasks', taskIds: [TASK_ID] });
  });
};

/** The run states `id` went through in the `runs` maps posted to the panel of `root`, oldest first; a map without `id` adds none. */
const runStatesOf = (api: TurboConsoleApi, root: string, id: string): GraphRunState[] => {
  const states: GraphRunState[] = [];

  for (const message of postedRuns(api, root)) {
    const state = message.runs[id];

    if (state !== undefined) states.push(state);
  }

  return states;
};

/** Running the task from the graph page repaints the graph: its `runs` entry goes `running`, then `passed`. */
export const runRepaintCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-7: running the task from the graph posts runs with it running, then passed', async () => {
    const node = await taskNodeNamed(api, TASK_PACKAGE, TASK_ID);
    const launchedAt = await startGraphRun(api, node);
    const ended = await endedRun(api, node, launchedAt);
    const isPassedPosted = (): boolean => runStatesOf(api, root, TASK_ID).includes('passed');

    await waitFor('passed runs post', isPassedPosted);

    const states = runStatesOf(api, root, TASK_ID);
    const firstRunning = states.indexOf('running');
    const lastPassed = states.lastIndexOf('passed');

    assert.equal(ended.state, 'passed');
    assert.ok(firstRunning >= 0, `no running post for ${TASK_ID}: ${states.join(', ')}`);
    assert.ok(lastPassed > firstRunning, `passed is not posted after running: ${states.join(', ')}`);
  });
};
