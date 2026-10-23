import { expect, test } from './graph-task.fixture.ts';
import { ERROR_STUB, LOADING_STUB } from './test/stubs/graph-state.stub.ts';
import { TASK_MODE_DOCS_TASK_STUB, TASK_MODE_NEW_HASH_STUB, TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphState } from '../src/bridge/common/graph-state.type.ts';
import { LOADING_TEXT } from '../src/graph/common/graph.const.ts';

const STATES = { description: 'M4-5a slice 2 review P1', type: 'requirement' };

const SHOW_TASKS = { description: 'M4-5a spec 3.2.1, slice 2 review note 4', type: 'requirement' };

const STATUS = { description: 'M4-5a slice 2 proof Obs 2', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

const EXPORT_FAILED_TEXT = 'Could not export the image';

type Interruption = {
  readonly kind: string;
  readonly state: GraphState;
  readonly text: string;
};

/** A non-graph state and the text the page shows for it. */
const INTERRUPTIONS: Interruption[] = [
  { kind: 'an error', state: ERROR_STUB, text: 'turbo exited with code 1' },
  { kind: 'a loading', state: LOADING_STUB, text: LOADING_TEXT }
];

test.describe('FEATURE: task mode across a state with no graph', () => {
  for (const { kind, state, text } of INTERRUPTIONS) {
    test(
      `GIVEN task mode on, ${kind} state then the graph again shows the toolbar and the chain, and the toggle still leaves task mode`,
      { annotation: STATES },
      async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskProbe, graphToolbar }): Promise<void> => {
        await test.step('WHEN the page opens cold in task mode with app#build chosen', async (): Promise<void> => {
          await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
          await graphHost.sendState(TASK_MODE_STATE_STUB);
          await graphTaskProbe.expectTaskIds(CHAIN);
        });

        await test.step(`AND ${kind} state arrives`, async (): Promise<void> => {
          await graphHost.sendState(state);
          await graphPage.expectText(text);
        });

        await test.step('AND the graph state arrives again', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

        await test.step('THEN the toolbar shows and the chain is drawn in task mode', async (): Promise<void> => {
          await expect(graphToolbar.toolbar).toBeVisible();
          await graphTaskProbe.expectTaskIds(CHAIN);
          await graphTask.expectPressed(true);
        });

        await test.step('WHEN the Task mode toggle is pressed', async (): Promise<void> => graphTask.toggle());

        await test.step('THEN the package graph is drawn', async (): Promise<void> => {
          await graphTask.expectPressed(false);
          await graphProbe.expectNodeIds(PACKAGES);
        });
      }
    );
  }
});

test.describe('FEATURE: Show tasks after a refresh', () => {
  test(
    'GIVEN docs picked with no task, the same hash giving docs its first task offers Show tasks',
    { annotation: SHOW_TASKS },
    async ({ graphHost, graphList, graphPage, graphProbe, graphTask }): Promise<void> => {
      await test.step('WHEN the graph with docs is drawn and docs is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_NEW_HASH_STUB);
        await graphProbe.expectNodeIds([...PACKAGES, 'docs']);
        await graphList.pick('docs');
      });

      await test.step('THEN the details panel has no Show tasks', async (): Promise<void> =>
        expect(graphTask.showTasksButton).toBeHidden());

      await test.step('WHEN the same hash arrives with docs#build', async (): Promise<void> =>
        graphHost.sendState(TASK_MODE_DOCS_TASK_STUB));

      await test.step('THEN the details panel offers Show tasks', async (): Promise<void> =>
        expect(graphTask.showTasksButton).toBeVisible());
    }
  );
});

test.describe('FEATURE: the package status line in task mode', () => {
  test.beforeEach(async ({ graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN the package graph drawn with app picked', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphProbe.expectNodeIds(PACKAGES);
      await graphList.pick('app');
      await expect(graphPage.status).toHaveText(/^app · /u);
    });
  });

  test(
    'GIVEN app picked, task mode empties the status line and leaving it names app again',
    { annotation: STATUS },
    async ({ graphPage, graphTask }): Promise<void> => {
      await test.step('WHEN the Task mode toggle is pressed', async (): Promise<void> => graphTask.toggle());

      await test.step('THEN the status line is empty', async (): Promise<void> => expect(graphPage.status).toHaveText(''));

      await test.step('WHEN the Task mode toggle is pressed again', async (): Promise<void> => graphTask.toggle());

      await test.step('THEN the status line names app again', async (): Promise<void> =>
        expect(graphPage.status).toHaveText(/^app · /u));
    }
  );

  test(
    'GIVEN app picked and task mode on, a failed export still says so on the status line',
    { annotation: STATUS },
    async ({ graphExport, graphPage, graphTask }): Promise<void> => {
      await test.step('WHEN the Task mode toggle is pressed and canvas reads fail', async (): Promise<void> => {
        await graphTask.toggle();
        await graphExport.breakCanvasReads();
      });

      await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN the status line says the export failed', async (): Promise<void> =>
        expect(graphPage.status).toHaveText(EXPORT_FAILED_TEXT));
    }
  );
});
