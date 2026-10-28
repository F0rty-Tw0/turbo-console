import { expect, test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const U4A = { description: 'U4a D8', type: 'requirement' };

const BOARDS = placedBoardsState();

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

const NOTCH_OUT = 100;

test.describe('FEATURE: a wheel over a widget', () => {
  test(
    'GIVEN the grouped boards, one notch out over the apps "…" zooms out and keeps the model point under the pointer',
    { annotation: U4A },
    async ({ graphFolderInspect, graphProbe, graphWidgetInput }): Promise<void> => {
      await test.step('GIVEN the grouped boards open', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS));

      const zoomBefore = await graphProbe.zoom();
      const pointer = await graphWidgetInput.ellipsisCentre('apps');
      const before = await graphWidgetInput.modelPointUnder(pointer);

      await test.step('WHEN the wheel turns one notch out over the apps "…"', async (): Promise<void> =>
        graphWidgetInput.wheelOverEllipsis('apps', NOTCH_OUT));

      await test.step('THEN the zoom drops', async (): Promise<void> => {
        await expect.poll(async (): Promise<number> => graphProbe.zoom()).toBeLessThan(zoomBefore);
      });

      await test.step('AND the model point under the pointer moves under 1 px', async (): Promise<void> => {
        const after = await graphWidgetInput.modelPointUnder(pointer);

        expect(Math.abs(after.x - before.x)).toBeLessThan(1);
        expect(Math.abs(after.y - before.y)).toBeLessThan(1);
      });
    }
  );

  test(
    'GIVEN the apps menu open, a wheel over the menu leaves the zoom and the menu alone',
    { annotation: U4A },
    async ({ graphFolderInspect, graphProbe, graphWidgetInput, page }): Promise<void> => {
      await test.step('GIVEN the grouped boards open and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS);
        await graphWidgetInput.openFolderMenu('apps');
      });

      const items = await graphWidgetInput.menu.locator('.widget-menu-item').allTextContents();
      const zoomBefore = await graphProbe.zoom();

      await test.step('WHEN the wheel turns over the menu', async (): Promise<void> => {
        await graphWidgetInput.wheelOverMenu(NOTCH_OUT);
        await page.evaluate(async (): Promise<void> => {
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
      });

      await test.step('THEN the zoom is unchanged', async (): Promise<void> => {
        const zoomAfter = await graphProbe.zoom();

        expect(zoomAfter).toBe(zoomBefore);
      });

      await test.step('AND the menu stays open', async (): Promise<void> => graphWidgetInput.expectItems(items));
    }
  );

  test(
    'GIVEN task mode with app#build selected, a wheel over its "…" zooms out',
    { annotation: U4A },
    async ({ graphCanvas, graphHost, graphPage, graphProbe, graphTaskProbe, graphWidgetInput, page }): Promise<void> => {
      await test.step('GIVEN a cold open in task mode with app#build chosen and selected', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphCanvas.tapNode('app#build');
      });

      const zoomBefore = await graphProbe.zoom();
      const menuButton = page.getByRole('button', { name: 'Actions for app#build', exact: true });

      await test.step('WHEN the wheel turns one notch out over its "…"', async (): Promise<void> =>
        graphWidgetInput.wheelOver(menuButton, NOTCH_OUT));

      await test.step('THEN the zoom drops', async (): Promise<void> => {
        await expect.poll(async (): Promise<number> => graphProbe.zoom()).toBeLessThan(zoomBefore);
      });
    }
  );
});
