import type { ShotSetup } from './common/graph-shots.type.ts';
import { expect, test } from './graph.fixture.ts';
import { GraphShots } from './pages/graph-shots.po.ts';
import { THEME_DARK_STUB, THEME_HC_STUB, THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';
import { collapsedSavedState } from './test/utils/graph-folder-states.spec.util.ts';
import { FOLDERS_SHOT_COLLAPSED, foldersShotState } from './test/utils/graph-folders-shot.spec.util.ts';
import { closedPanelsSavedState } from './test/utils/graph-shot-state.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';

const THEMES = [
  { name: 'dark', theme: THEME_DARK_STUB },
  { name: 'light', theme: THEME_LIGHT_STUB },
  { name: 'high-contrast', theme: THEME_HC_STUB }
] as const;

const FOLDERS = foldersShotState();

const TARGET_LIKE_STATE = targetLikeState();

const TARGET_LIKE: ShotSetup = {
  state: TARGET_LIKE_STATE,
  saved: closedPanelsSavedState(TARGET_LIKE_STATE.hash),
  cache: 'positions'
};

const FOLDERS_SETUP: ShotSetup = {
  state: FOLDERS,
  saved: collapsedSavedState(FOLDERS.hash, FOLDERS_SHOT_COLLAPSED),
  cache: 'folderPositions'
};

test.describe('FEATURE: theme screenshots', () => {
  for (const { name, theme } of THEMES) {
    test(`GIVEN the ${name} theme, the target-like graph matches target-like-${name}.png`, async ({ page }): Promise<void> => {
      const shots = new GraphShots(page);

      await test.step('WHEN target-like is laid out once and reopened from its cache', async (): Promise<void> =>
        shots.openCached(TARGET_LIKE, theme));

      await test.step(`THEN the page matches target-like-${name}.png`, async (): Promise<void> =>
        expect(page).toHaveScreenshot(`target-like-${name}.png`));
    });

    test(`GIVEN the ${name} theme, the inspected hub matches target-like-inspect-${name}.png`, async ({ page }): Promise<void> => {
      const shots = new GraphShots(page);

      await test.step('WHEN target-like is laid out once and reopened from its cache', async (): Promise<void> =>
        shots.openCached(TARGET_LIKE, theme));

      await test.step('AND hub is selected from the controls and shown in the details', async (): Promise<void> =>
        shots.inspect('hub'));

      await test.step(`THEN the page matches target-like-inspect-${name}.png`, async (): Promise<void> =>
        expect(page).toHaveScreenshot(`target-like-inspect-${name}.png`));
    });

    test(`GIVEN the ${name} theme, the grouped folders match folders-${name}.png`, async ({ page }): Promise<void> => {
      const shots = new GraphShots(page);

      await test.step('WHEN the folders graph is grouped with tools collapsed and reopened from its cache', async (): Promise<void> =>
        shots.openCached(FOLDERS_SETUP, theme));

      await test.step('AND the apps and libs header rows are shown', async (): Promise<void> =>
        shots.expectHeaderRows(['apps', 'libs']));

      await test.step(`THEN the page matches folders-${name}.png`, async (): Promise<void> =>
        expect(page).toHaveScreenshot(`folders-${name}.png`));
    });
  }
});
