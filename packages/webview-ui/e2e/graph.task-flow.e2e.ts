import type { ElementRect } from './common/playwright.type.ts';
import { expect, test } from './graph-task.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { colourSwapsOf } from './test/utils/graph-flow-ink.spec.util.ts';
import { TARGET_LIKE_NORMAL_SHOWN, targetLikeLitStatesOf } from './test/utils/graph-target-like-lit.spec.util.ts';
import {
  OVER_CAP_ROOT_TASK,
  TARGET_LIKE_CHOSEN_TASK,
  overCapTasksState,
  targetLikeTasksState
} from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { FIT_LABEL, VIEW_STATE_DEBOUNCE_MS } from '../src/graph/common/graph.const.ts';

const FLOW = { description: 'M4-5a AC7, spec 3.5', type: 'requirement' };

const CAP = { description: 'M4-5a slice 3 performance review: the flow edge cap', type: 'requirement' };

const DRIFT = { description: 'M4-5a Risks: overlay geometry drift', type: 'requirement' };

const TARGET_LIKE_HASH = '7a7a7a7b';

/** `lib-3#test` needs `lib-3#build`, which needs `hub#build`: two straight highlighted edges. */
const LEAF = 'lib-3#test';

const LEAF_DEPENDENCY = 'lib-3#build';

/** One dash cycle (`FLOW_CYCLE_MS`), so two samples this far apart show the dashes at the same phase. */
const CYCLE_MS = 160;

const PAN = { dx: 60, dy: 40 };

const DRIFT_TOLERANCE_PX = 12;

const NO_BOUNDS: ElementRect = { left: Number.NaN, top: Number.NaN, width: 0, height: 0 };

const LEAF_SELECTED_SAVED = taskSavedState(TARGET_LIKE_HASH, { chosen: [TARGET_LIKE_CHOSEN_TASK], selected: LEAF });

/** Package mode, with lib-3#build chosen and lib-3#test selected for task mode. */
const PACKAGE_MODE_SAVED: GraphViewState = { ...LEAF_SELECTED_SAVED, mode: 'packages' };

test.describe('FEATURE: graph task flow', () => {
  test.describe('GIVEN task mode with lib-3#build chosen under the fake clock', () => {
    test.beforeEach(async ({ graphFlow, graphHost, graphPage, graphProbe, pageClock }): Promise<void> => {
      await pageClock.install();
      await graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, { chosen: [TARGET_LIKE_CHOSEN_TASK] }) });
      await graphHost.sendState(targetLikeTasksState());
      await graphFlow.waitForLayout();
      await graphProbe.expectNodeStates(TARGET_LIKE_NORMAL_SHOWN);
    });

    test('a hovered task with edges animates its flow', { annotation: FLOW }, async ({ graphFlow }): Promise<void> => {
      let earlier = '';

      await test.step('WHEN lib-3#test is hovered and a frame draws', async (): Promise<void> => {
        await graphFlow.hover(LEAF);
        await graphFlow.tick(16);
        earlier = await graphFlow.image();
      });

      await test.step('AND 80 ms pass', async (): Promise<void> => graphFlow.tick(80));

      await test.step('THEN the overlay is inked and differs from the sample 80 ms earlier', async (): Promise<void> => {
        const later = await graphFlow.image();

        await graphFlow.expectInked(true);
        expect(later).not.toBe(earlier);
      });
    });

    test(
      'on screen the flow shows as background-coloured dashes moving along the highlighted edge',
      { annotation: FLOW },
      async ({ graphFlow }): Promise<void> => {
        let earlier = '';
        let later = '';

        await test.step('WHEN lib-3#test is hovered, a frame draws and its edge to lib-3#build is read', async (): Promise<void> => {
          await graphFlow.hover(LEAF);
          await graphFlow.tick(16);
          earlier = await graphFlow.edgeColours(LEAF, LEAF_DEPENDENCY);
        });

        await test.step('AND 80 ms later it is read again', async (): Promise<void> => {
          await graphFlow.tick(80);
          later = await graphFlow.edgeColours(LEAF, LEAF_DEPENDENCY);
        });

        await test.step('THEN each reading shows both colours and some pixels swap between them', (): void => {
          const readings = `${earlier} -> ${later}`;
          const swaps = colourSwapsOf(earlier, later);

          expect(earlier, readings).toMatch(/h.*b|b.*h/);
          expect(later, readings).toMatch(/h.*b|b.*h/);
          expect(swaps, readings).toBeGreaterThan(0);
        });
      }
    );

    test(
      'with no pointer move the flow stops after 3 s and stays stopped, the highlight kept',
      { annotation: FLOW },
      async ({ graphFlow, graphProbe }): Promise<void> => {
        await test.step('WHEN lib-3#test is hovered and 3100 ms pass', async (): Promise<void> => {
          await graphFlow.hover(LEAF);
          await graphFlow.tick(3100);
        });

        await test.step('THEN the overlay is clear', async (): Promise<void> => graphFlow.expectInked(false));

        await test.step('WHEN 400 ms more pass', async (): Promise<void> => graphFlow.tick(400));

        await test.step('THEN it is still clear and the chain still reads lit', async (): Promise<void> => {
          await graphFlow.expectInked(false);
          await graphProbe.expectNodeStates(targetLikeLitStatesOf(LEAF));
        });
      }
    );

    test('a pointer move at 2500 ms keeps the flow running past 3 s', { annotation: FLOW }, async ({ graphFlow }): Promise<void> => {
      await test.step('WHEN lib-3#test is hovered, the pointer moves at 2500 ms and 3100 ms have passed', async (): Promise<void> => {
        await graphFlow.hover(LEAF);
        await graphFlow.tick(2500);
        await graphFlow.nudge();
        await graphFlow.tick(600);
      });

      await test.step('THEN the overlay is inked', async (): Promise<void> => graphFlow.expectInked(true));

      await test.step('WHEN 5600 ms have passed', async (): Promise<void> => graphFlow.tick(2500));

      await test.step('THEN the overlay is clear', async (): Promise<void> => graphFlow.expectInked(false));
    });

    test(
      'reduced motion turned on mid-flow clears the overlay within a few frames, long before the idle stop',
      { annotation: FLOW },
      async ({ graphFlow }): Promise<void> => {
        await test.step('WHEN lib-3#test is hovered and the flow has drawn for 200 ms', async (): Promise<void> => {
          await graphFlow.hover(LEAF);
          await graphFlow.tick(200);
          await graphFlow.expectInked(true);
        });

        await test.step('AND the OS asks for reduced motion', async (): Promise<void> => graphFlow.reduceMotion());

        await test.step('THEN the overlay clears', async (): Promise<void> => graphFlow.waitForClear());
      }
    );

    test(
      'GIVEN reduced motion, a hovered task never inks the overlay',
      { annotation: FLOW },
      async ({ graphFlow, graphProbe }): Promise<void> => {
        await test.step('WHEN the OS asks for reduced motion and lib-3#test is hovered for 200 ms', async (): Promise<void> => {
          await graphFlow.reduceMotion();
          await graphFlow.hover(LEAF);
          await graphFlow.tick(200);
        });

        await test.step('THEN the chain reads lit and the overlay is clear', async (): Promise<void> => {
          await graphProbe.expectNodeStates(targetLikeLitStatesOf(LEAF));
          await graphFlow.expectInked(false);
        });
      }
    );

    test(
      'a pan moves the drawn flow with the camera, straight lone edges included',
      { annotation: DRIFT },
      async ({ graphFlow, graphTaskHost }): Promise<void> => {
        let before = NO_BOUNDS;

        await test.step('GIVEN lib-3#test selected and its flow drawn', async (): Promise<void> => {
          await graphFlow.tap(LEAF);
          await graphFlow.tick(VIEW_STATE_DEBOUNCE_MS);
          await graphTaskHost.expectSavedTask({ selected: LEAF });
          before = await graphFlow.inkBounds();
        });

        await test.step('WHEN the camera pans by (60, 40) and one dash cycle passes', async (): Promise<void> => {
          await graphFlow.pan(PAN.dx, PAN.dy);
          await graphFlow.tick(CYCLE_MS);
        });

        await test.step('THEN the ink moved by the pan within 12 px', async (): Promise<void> => {
          const after = await graphFlow.inkBounds();
          const driftX = Math.abs(after.left - before.left - PAN.dx);
          const driftY = Math.abs(after.top - before.top - PAN.dy);

          expect(driftX).toBeLessThanOrEqual(DRIFT_TOLERANCE_PX);
          expect(driftY).toBeLessThanOrEqual(DRIFT_TOLERANCE_PX);
        });
      }
    );
  });

  test(
    'GIVEN package mode with a selection, the overlay stays clear under the widget layer',
    { annotation: FLOW },
    async ({ graphFlow, graphHost, graphPage, graphProbe, pageClock }): Promise<void> => {
      await test.step('WHEN the controls graph is sent and ui is selected', async (): Promise<void> => {
        await pageClock.install();
        await graphPage.open();
        await graphHost.sendState(CONTROLS_CACHED_STUB);
        await graphFlow.waitForLayout();
        await graphFlow.tap('ui');
        await graphProbe.expectSelected('ui');
        await graphFlow.tick(200);
      });

      await test.step('THEN the overlay is clear', async (): Promise<void> => graphFlow.expectInked(false));

      await test.step('AND it takes no pointer events, with the widget layer next', async (): Promise<void> =>
        graphFlow.expectUnderWidgets());
    }
  );

  test(
    'GIVEN lib-3 selected in package mode, entering task mode draws no flow until the task layout lands, then the saved selection flows',
    { annotation: FLOW },
    async ({ graphFlow, graphGrouping, graphHost, graphPage, graphProbe, graphTask, pageClock }): Promise<void> => {
      await test.step('WHEN the package graph is laid out and lib-3 is selected', async (): Promise<void> => {
        await pageClock.install();
        await graphPage.open({ savedState: PACKAGE_MODE_SAVED, workers: 'held' });
        await graphGrouping.releaseWorker();
        await graphHost.sendState(targetLikeTasksState());
        await graphFlow.waitForLayout();
        await graphFlow.tap('lib-3');
        await graphProbe.expectSelected('lib-3');
      });

      await test.step('AND the worker is held, Task mode is pressed and 100 ms pass', async (): Promise<void> => {
        await graphGrouping.holdWorker();
        await graphTask.toggleButton.dispatchEvent('click');
        await graphFlow.tick(100);
      });

      await test.step('THEN the overlay is clear and the probe already reads the saved task as selected', async (): Promise<void> => {
        await graphFlow.expectInked(false);
        await graphProbe.expectSelected(LEAF);
      });

      await test.step('WHEN the worker is released and the task layout lands', async (): Promise<void> => {
        await graphGrouping.releaseWorker();
        await graphFlow.waitForNode(LEAF);
        await graphFlow.tick(32);
      });

      await test.step('THEN the saved selection reads lit and its flow is drawn', async (): Promise<void> => {
        await graphProbe.expectNodeStates(targetLikeLitStatesOf(LEAF));
        await graphFlow.expectInked(true);
      });
    }
  );

  test(
    'GIVEN 400 dependents lit, the root hover keeps the highlight and draws no flow',
    { annotation: CAP },
    async ({ graphFlow, graphHost, graphHover, graphPage, pageClock }): Promise<void> => {
      await test.step('WHEN the over-cap state is shown with its cap lifted and Fit centres it (400 leaves are wider than the minimum zoom shows, so the root sits mid-view)', async (): Promise<void> => {
        await pageClock.install();
        await graphPage.open({
          savedState: taskSavedState(overCapTasksState().hash, { chosen: [OVER_CAP_ROOT_TASK], capLifted: true })
        });
        await graphHost.sendState(overCapTasksState());
        await graphFlow.waitForNode(OVER_CAP_ROOT_TASK);
        await graphPage.pressButton(FIT_LABEL);
        await graphFlow.tick(400);
      });

      await test.step('AND the root task is hovered and 200 ms pass', async (): Promise<void> => {
        await graphFlow.hover(OVER_CAP_ROOT_TASK);
        await graphFlow.tick(200);
      });

      await test.step('THEN its edges read highlighted', async (): Promise<void> => graphHover.expectLitEdges());

      await test.step('AND the flow overlay has no ink', async (): Promise<void> => graphFlow.expectInked(false));
    }
  );
});
