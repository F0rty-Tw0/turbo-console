import { test } from './graph-task.fixture.ts';
import { THEME_DARK_STUB, THEME_HC_STUB } from './test/stubs/graph-theme.stub.ts';
import { closedPanelsSavedState } from './test/utils/graph-shot-state.spec.util.ts';
import { TARGET_LIKE_CHOSEN_TASK, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const HC_FLOOR = { description: 'M4-5a Task 3.4, WCAG 1.4.11 non-text contrast', type: 'requirement' };

/** WCAG's 3:1 floor for the parts of a graphic a user must see. */
const NON_TEXT_RATIO = 3;

const PACKAGES = targetLikeState();

const TASKS = targetLikeTasksState();

/** Neither a dependency nor a dependent of `hub`, so selecting `hub` dims it. */
const DIMMED_PACKAGE = 'util-a';

/** Off `lib-3#test`'s chain inside `lib-3#build`'s, so selecting `lib-3#test` dims it. */
const DIMMED_TASK = 'lib-3#docs';

const CLOSED_PANELS = closedPanelsSavedState(PACKAGES.hash);

const HUB_SELECTED: GraphViewState = { ...CLOSED_PANELS, selected: 'hub' };

test.describe('FEATURE: graph dimmed contrast', () => {
  test(
    'GIVEN the high contrast theme and package mode with hub selected, a dimmed package reads at least 3:1',
    { annotation: HC_FLOOR },
    async ({ graphHost, graphLook, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page opens with hub selected in the high contrast theme', async (): Promise<void> => {
        await graphPage.open({ savedState: HUB_SELECTED });
        await graphLook.applyTheme(THEME_HC_STUB);
        await graphHost.sendState(PACKAGES);
        await graphProbe.expectSelected('hub');
      });

      await test.step(`THEN ${DIMMED_PACKAGE} reads at least 3:1 against the background`, async (): Promise<void> =>
        graphLook.expectDimmedContrastAtLeast(DIMMED_PACKAGE, THEME_HC_STUB.expected.fill, NON_TEXT_RATIO));
    }
  );

  test(
    'GIVEN the high contrast theme and task mode with a restored selection, a dimmed task reads at least 3:1',
    { annotation: HC_FLOOR },
    async ({ graphHost, graphLook, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page opens on lib-3#build with lib-3#test selected', async (): Promise<void> => {
        const saved = taskSavedState(TASKS.hash, { chosen: [TARGET_LIKE_CHOSEN_TASK], selected: 'lib-3#test' });

        await graphPage.open({ savedState: saved });
        await graphLook.applyTheme(THEME_HC_STUB);
        await graphHost.sendState(TASKS);
        await graphTaskHost.expectSavedTask({ selected: 'lib-3#test' });
      });

      await test.step(`THEN ${DIMMED_TASK} reads at least 3:1 against the background`, async (): Promise<void> =>
        graphLook.expectDimmedContrastAtLeast(DIMMED_TASK, THEME_HC_STUB.expected.fill, NON_TEXT_RATIO));
    }
  );

  test(
    'GIVEN the dark theme and package mode with hub selected, a dimmed package stays below 3:1, as the floor is high contrast only',
    { annotation: HC_FLOOR },
    async ({ graphHost, graphLook, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page opens with hub selected in the dark theme', async (): Promise<void> => {
        await graphPage.open({ savedState: HUB_SELECTED });
        await graphLook.applyTheme(THEME_DARK_STUB);
        await graphHost.sendState(PACKAGES);
        await graphProbe.expectSelected('hub');
      });

      await test.step(`THEN ${DIMMED_PACKAGE} reads below 3:1 against the background`, async (): Promise<void> =>
        graphLook.expectDimmedContrastBelow(DIMMED_PACKAGE, THEME_DARK_STUB.expected.fill, NON_TEXT_RATIO));
    }
  );
});
