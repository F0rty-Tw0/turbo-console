import type { Locator } from '@playwright/test';

import { expect, test } from './graph-task.fixture.ts';
import { TASK_MODE_NEW_HASH_STUB, TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphWebviewMessage } from '../src/bridge/common/graph-message.type.ts';
import { START_TRACE_LABEL } from '../src/graph/common/details.const.ts';
import { PACKAGES_MODE_LABEL, SHOW_TASKS_LABEL } from '../src/graph/common/graph-task.const.ts';

const SHOW_TASKS = { description: 'M4-5a spec 3.2.1', type: 'requirement' };

const TASK_MENU = { description: 'M4-5a spec 3.2 side panel, 6.4', type: 'requirement' };

const FOCUS = { description: 'M4-5a spec 9a.6, WCAG 2.4.3', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

/** `app`'s tasks and the chain `app#build` needs; `app#lint` stands alone. */
const APP_SET = ['app#build', 'app#lint', 'lib#build', 'ui#build'];

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

const RUN_APP: GraphWebviewMessage = { type: 'runTask', taskId: 'app#build', noCache: false };

type ToggleExit = {
  readonly way: string;
  readonly leave: (toggle: Locator) => Promise<void>;
};

/** The two ways off Tasks: a pointer click and Enter with Packages focused. */
const TOGGLE_EXITS: ToggleExit[] = [
  { way: 'a click', leave: async (toggle): Promise<void> => toggle.click() },
  { way: 'Enter', leave: async (toggle): Promise<void> => toggle.press('Enter') }
];

/** Another hash than the stubs', so the grouping carries over and the camera fits the new graph. */
const OTHER_HASH = '7a5c00ff';

test.describe('FEATURE: Show tasks from the package graph', () => {
  test(
    'GIVEN app picked in the flat package graph, Show tasks in the details panel draws its tasks and their chain in task mode',
    { annotation: SHOW_TASKS },
    async ({ graphHost, graphList, graphPage, graphProbe, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the package graph is drawn and app is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphList.pick('app');
      });

      await test.step('AND Show tasks is pressed in the details panel', async (): Promise<void> => graphTask.showTasksButton.click());

      await test.step('THEN task mode is on', async (): Promise<void> => graphTask.expectPressed(true));

      await test.step("AND app's tasks and their chain are drawn", async (): Promise<void> => graphTaskProbe.expectTaskIds(APP_SET));
    }
  );

  test(
    'GIVEN docs, a package with no task, picked, the details panel offers no Show tasks',
    { annotation: SHOW_TASKS },
    async ({ graphHost, graphList, graphPage, graphProbe, graphTask }): Promise<void> => {
      await test.step('WHEN the package graph with docs is drawn and docs is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_NEW_HASH_STUB);
        await graphProbe.expectNodeIds([...PACKAGES, 'docs']);
        await graphList.pick('docs');
      });

      await test.step('THEN the details panel shows docs with Start trace', async (): Promise<void> =>
        expect(graphTask.detailsButton(START_TRACE_LABEL)).toBeVisible());

      await test.step('AND it has no Show tasks', async (): Promise<void> => expect(graphTask.showTasksButton).toBeHidden());
    }
  );

  test(
    'GIVEN app picked in the grouped package graph, Show tasks in its "…" menu draws its tasks and their chain in task mode',
    { annotation: SHOW_TASKS },
    async ({ graphHost, graphList, graphMenus, graphPage, graphProbe, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the grouped package graph is drawn and app is picked', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(OTHER_HASH) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphList.pick('app');
      });

      await test.step('AND Show tasks is chosen from its "…" menu', async (): Promise<void> => {
        await graphMenus.openPackageMenu('app');
        await graphMenus.item(SHOW_TASKS_LABEL).click();
      });

      await test.step('THEN task mode is on', async (): Promise<void> => graphTask.expectPressed(true));

      await test.step("AND app's tasks and their chain are drawn", async (): Promise<void> => graphTaskProbe.expectTaskIds(APP_SET));
    }
  );
});

test.describe('FEATURE: the task "…" menu and leaving a cold task mode', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
    await test.step('GIVEN a cold open in task mode with app#build chosen', async (): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphTaskProbe.expectTaskIds(CHAIN);
    });
  });

  test(
    'GIVEN app#build selected, Run in its "…" menu posts runTask',
    { annotation: TASK_MENU },
    async ({ graphCanvas, graphMenus, graphTask, graphTaskHost }): Promise<void> => {
      await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('THEN its "…" sits on its top-right corner', async (): Promise<void> =>
        graphTask.expectMenuButtonOnCorner('app#build'));

      await test.step('WHEN its "…" is pressed', async (): Promise<void> => graphTask.menu('app#build'));

      await test.step('THEN the menu offers Run and Run without cache', async (): Promise<void> =>
        graphMenus.expectItems(['Run', 'Run without cache']));

      await test.step('WHEN Run is chosen', async (): Promise<void> => graphMenus.item('Run').click());

      await test.step('THEN runTask is posted for app#build', async (): Promise<void> => graphTaskHost.expectTaskPosts([RUN_APP]));
    }
  );

  test(
    'GIVEN app#build running and its "…" menu open, Stop chosen after the run ended posts nothing',
    { annotation: TASK_MENU },
    async ({ graphCanvas, graphMenus, graphTask, graphTaskHost }): Promise<void> => {
      await test.step('WHEN app#build runs, is tapped and its "…" is pressed', async (): Promise<void> => {
        await graphTaskHost.sendRuns({ 'app#build': 'running' });
        await graphCanvas.tapNode('app#build');
        await graphTask.menu('app#build');
      });

      await test.step('THEN the menu offers Stop', async (): Promise<void> =>
        graphMenus.expectItems(['Run', 'Run without cache', 'Stop']));

      await test.step('WHEN the run passes and then Stop is chosen', async (): Promise<void> => {
        await graphTaskHost.sendRuns({ 'app#build': 'passed' });
        await graphMenus.item('Stop').click();
      });

      await test.step('THEN no task message is posted', async (): Promise<void> => graphTaskHost.expectNoTaskPosts());
    }
  );

  for (const { way, leave } of TOGGLE_EXITS) {
    test(
      `${way} on Packages leaves task mode and gives it focus once the package graph shows`,
      { annotation: FOCUS },
      async ({ graphPage, graphProbe, graphTask }): Promise<void> => {
        await test.step(`WHEN Packages gets ${way}`, async (): Promise<void> => leave(graphTask.packagesButton));

        await test.step('THEN the package nodes are drawn', async (): Promise<void> => graphProbe.expectNodeIds(PACKAGES));

        await test.step('AND Packages has focus', async (): Promise<void> => graphPage.expectButtonFocused(PACKAGES_MODE_LABEL));
      }
    );
  }
});
