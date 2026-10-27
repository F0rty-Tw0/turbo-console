import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { packageStates } from './details-posted.spec.util.ts';
import { lastGraphState, postedShowPackages, postedShowTasks } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { GraphPanelInfo, TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { OPEN_COMMAND } from '../common/details.const.ts';
import { ALL_TASKS_COMMAND, FOCUS_COMMAND, TASK_ID } from '../common/graph.const.ts';
import type { GraphScene } from '../common/graph.type.ts';

const showTasksCountOf = (api: TurboConsoleApi, root: string): number => {
  const posted = api.graph.posted(root);
  const requests = posted.filter((message): boolean => message.type === 'showTasks');

  return requests.length;
};

/** The package of the task `TASK_ID` in the graph panel's last state; throws when the state or the task is missing. */
const taskPackageOf = (scene: GraphScene): string => {
  const { api, root } = scene;
  const state = lastGraphState(api, root);
  const task = state?.tasks.find((candidate): boolean => candidate.id === TASK_ID);

  if (task === undefined) throw new Error(`the graph state has no task ${TASK_ID}`);

  return task.packageName;
};

/** `Show in task graph` on a task card of the Details page asks that root's graph panel to show that one task. */
export const detailsTaskGraphCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-8: Show in task graph on a Details card posts showTasks for that task', async () => {
    const packageName = taskPackageOf(scene);
    const before = showTasksCountOf(api, root);

    await vscode.commands.executeCommand(OPEN_COMMAND, { kind: 'pkg', root, packageName });
    await waitFor('package state', () => packageStates(api, root, packageName).length > 0);
    await api.details.whenIdle(root, packageName);

    const newest = packageStates(api, root, packageName).at(-1);

    assert.equal(newest?.taskGraph, true);

    await api.details.receive(root, packageName, { type: 'showInTaskGraph', taskId: TASK_ID });
    await waitFor('showTasks post', () => showTasksCountOf(api, root) > before);

    const isGraphOfRoot = (panel: GraphPanelInfo): boolean => panel.root === root;

    assert.deepEqual(postedShowTasks(api, root), { type: 'showTasks', taskIds: [TASK_ID] });
    assert.ok(api.graph.panels().some(isGraphOfRoot), 'no graph panel for the root');
  });
};

/** `Focus on graph` in the Details header asks that root's graph panel to show that package. */
export const detailsFocusGraphCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-10: Focus on graph in the Details header posts showPackage for that package', async () => {
    const packageName = taskPackageOf(scene);
    const before = postedShowPackages(api, root).length;

    await vscode.commands.executeCommand(OPEN_COMMAND, { kind: 'pkg', root, packageName });
    await waitFor('package state', () => packageStates(api, root, packageName).length > 0);
    await api.details.whenIdle(root, packageName);
    await api.details.receive(root, packageName, { type: 'focusInGraph' });
    await waitFor('showPackage post', () => postedShowPackages(api, root).length > before);

    const isGraphOfRoot = (panel: GraphPanelInfo): boolean => panel.root === root;
    const commands = await vscode.commands.getCommands(true);

    assert.deepEqual(postedShowPackages(api, root).at(-1), { type: 'showPackage', name: packageName });
    assert.ok(api.graph.panels().some(isGraphOfRoot), 'no graph panel for the root');
    assert.ok(commands.includes(FOCUS_COMMAND), `${FOCUS_COMMAND} is not registered`);
  });
};

/** `Show All Task Graphs` asks that root's graph panel to show every task of its graph state. */
export const showAllTaskGraphsCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-11: Show All Task Graphs posts showTasks for every task of the root', async () => {
    const before = showTasksCountOf(api, root);
    const state = lastGraphState(api, root);
    const expected = state?.tasks.map((task): string => task.id).toSorted() ?? [];

    await vscode.commands.executeCommand(ALL_TASKS_COMMAND);
    await waitFor('showTasks post', () => showTasksCountOf(api, root) > before);

    const posted = postedShowTasks(api, root);

    assert.ok(expected.length > 0, 'the graph state has no tasks');
    assert.deepEqual(posted?.taskIds.toSorted(), expected);
  });
};
