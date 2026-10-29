import { IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const D9 = { description: 'U4 D9', type: 'requirement' };

const GROUPED_TASKS: GraphViewState = groupedSavedState('7a5c00ff');

const FLAT_TASKS: GraphViewState = { ...GROUPED_TASKS, grouped: false };

test.describe('FEATURE: package node toolbar keys', () => {
  test(
    'GIVEN the flat task packages with app picked, Tab enters the package toolbar once and the arrow keys walk its buttons',
    { annotation: D9 },
    async ({ graphFolderInspect, graphKeys, graphList, graphNodeToolbar, graphPage, graphWidgets }): Promise<void> => {
      await test.step('WHEN the flat packages open, app is picked and the container is focused', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
        await graphWidgets.focusContainer();
      });

      await test.step('AND Tab is pressed', async (): Promise<void> => graphKeys.press('Tab'));

      await test.step('THEN Focus app has focus', async (): Promise<void> => graphNodeToolbar.expectButtonFocused('app', 'Focus app'));

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphKeys.press('ArrowRight'));

      await test.step('THEN Start trace has focus', async (): Promise<void> =>
        graphNodeToolbar.expectButtonFocused('app', 'Start trace'));

      await test.step('WHEN End is pressed', async (): Promise<void> => graphKeys.press('End'));

      await test.step('THEN the "…" has focus', async (): Promise<void> =>
        graphNodeToolbar.expectButtonFocused('app', 'Actions for app'));

      await test.step('WHEN Right is pressed again', async (): Promise<void> => graphKeys.press('ArrowRight'));

      await test.step('THEN Focus app has focus, wrapping', async (): Promise<void> =>
        graphNodeToolbar.expectButtonFocused('app', 'Focus app'));

      await test.step('WHEN Shift+Tab is pressed', async (): Promise<void> => graphKeys.press('Shift+Tab'));

      await test.step('THEN the container has focus', async (): Promise<void> => graphPage.expectContainerFocused());

      await test.step('WHEN Tab is pressed again', async (): Promise<void> => graphKeys.press('Tab'));

      await test.step('THEN Focus app has focus: the toolbar is one Tab stop', async (): Promise<void> =>
        graphNodeToolbar.expectButtonFocused('app', 'Focus app'));
    }
  );

  test(
    'GIVEN the flat task packages with app picked, Right then Enter on Start trace opens the picker and returns focus to the container',
    { annotation: D9 },
    async ({ graphFolderInspect, graphKeys, graphList, graphNodeToolbar, graphPage, graphTrace, graphWidgets }): Promise<void> => {
      await test.step('WHEN the flat packages open, app is picked and the container is focused', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
        await graphWidgets.focusContainer();
      });

      await test.step('AND Tab, Right and Enter are pressed', async (): Promise<void> => {
        await graphKeys.press('Tab');
        await graphKeys.press('ArrowRight');
        await graphKeys.press('Enter');
      });

      await test.step('THEN the details panel picks the trace end', async (): Promise<void> => graphTrace.expectPicking('app'));

      await test.step('AND the container has focus', async (): Promise<void> => graphPage.expectContainerFocused());
    }
  );

  test(
    'GIVEN the flat task packages with app picked and a toolbar button focused, Shift+F10 opens the package menu on the "…"',
    { annotation: D9 },
    async ({ graphFolderInspect, graphKeys, graphList, graphMenus, graphNodeToolbar, graphWidgets }): Promise<void> => {
      // eslint-disable-next-line playwright/no-skipped-test -- macOS Chromium never fires the event this test watches
      test.skip(IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON);

      await test.step('WHEN the flat packages open, app is picked and Start trace is reached by keys', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
        await graphWidgets.focusContainer();
        await graphKeys.press('Tab');
        await graphKeys.press('ArrowRight');
      });

      await test.step('AND Shift+F10 is pressed', async (): Promise<void> => graphMenus.pressShiftF10());

      await test.step('THEN the menu opens on the "…"', async (): Promise<void> => graphNodeToolbar.expectMenuOnEllipsis('app'));
    }
  );
});
