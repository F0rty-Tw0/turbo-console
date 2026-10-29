import { expect } from '@playwright/test';

import { test } from './graph-task.fixture.ts';
import { placedFoldersShotState } from './test/utils/graph-folders-shot.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';

const N7 = { description: 'U4 N7', type: 'requirement' };

const FOLDERS = placedFoldersShotState();

test.describe('FEATURE: node toolbar beside a package in a folder with a header row', () => {
  test(
    'GIVEN the placed folders grouped at zoom 1, the "…" of ui, in the libs top row, clears the libs header row',
    { annotation: N7 },
    async ({ graphCanvas, graphFolderInspect, graphNodeToolbar, graphWidgets }): Promise<void> => {
      await test.step('GIVEN the placed folders grouped at zoom 1', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(FOLDERS.hash, {}), FOLDERS));

      await test.step('WHEN ui, in the libs top row, is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('THEN ui is in view', async (): Promise<void> => graphNodeToolbar.expectNodeInView('ui'));

      await test.step('AND the libs header row shows', async (): Promise<void> => expect(graphWidgets.rowOf('libs')).toBeVisible());

      await test.step('THEN the "…" meets no part of the libs header row', async (): Promise<void> =>
        graphNodeToolbar.expectToolbarClearOfRow('ui', 'libs'));

      await test.step('THEN its "…" sits 4 px under ui, right edges level', async (): Promise<void> =>
        graphNodeToolbar.expectNodeToolbarOn('ui', 'below'));
    }
  );

  test(
    'GIVEN the placed folders grouped at zoom 1, the "…" of core, lower in libs, stays above it',
    { annotation: N7 },
    async ({ graphCanvas, graphFolderInspect, graphNodeToolbar }): Promise<void> => {
      await test.step('GIVEN the placed folders grouped at zoom 1', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(FOLDERS.hash, {}), FOLDERS));

      await test.step('WHEN core, lower in libs, is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN core is in view', async (): Promise<void> => graphNodeToolbar.expectNodeInView('core'));

      await test.step('THEN its "…" sits 4 px above core', async (): Promise<void> =>
        graphNodeToolbar.expectNodeToolbarOn('core', 'above'));
    }
  );
});
