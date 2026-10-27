import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { lastGraphState, postedShowTasks } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { ALL_TASKS_COMMAND } from '../common/graph.const.ts';
import { ROOT_BUILD_ID, SINGLE_APP_NAME, SINGLE_TASK_IDS } from '../common/single-package.const.ts';

const showTasksCountOf = (api: TurboConsoleApi, root: string): number => {
  const posted = api.graph.posted(root);
  const requests = posted.filter((message): boolean => message.type === 'showTasks');

  return requests.length;
};

/**
 * L11-9 (spec §2.9): Show All Task Graphs on the single-package root opens a task-mode panel instead of refusing. The
 * harness has no message reader, so a panel for the root is the proof that no info message replaced it.
 */
export const taskGraphCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L11-9: Show All Task Graphs opens a task-mode panel on the single-package root', async () => {
    const before = showTasksCountOf(api, root);

    await vscode.commands.executeCommand(ALL_TASKS_COMMAND);
    await waitFor('showTasks post', () => showTasksCountOf(api, root) > before);

    const state = lastGraphState(api, root);
    const tasks = state?.tasks ?? [];
    const stateIds = tasks.map((task) => task.id).sort();
    const unit = tasks.find((task) => task.id === '//#test:unit');
    const request = postedShowTasks(api, root);
    const shownIds = request?.taskIds.toSorted();
    const hasPanel = api.graph.panels().some((panel) => panel.root === root);

    assert.ok(hasPanel, 'no graph panel for the root');
    assert.equal(state?.singlePackage, true);
    assert.equal(state.rootLabel, SINGLE_APP_NAME);
    assert.deepEqual(unit?.dependencies, [ROOT_BUILD_ID]);
    assert.deepEqual(shownIds, stateIds);
    assert.ok(SINGLE_TASK_IDS.every((id) => stateIds.includes(id)));
  });
};
