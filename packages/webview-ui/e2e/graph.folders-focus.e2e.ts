import { test } from './graph.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { packageInspection } from './test/utils/graph-inspection.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const C6 = { description: 'M4-4 C6', type: 'requirement' };

const BOARDS = placedBoardsState();

const UI = '@acme/ui';

const UT = '@acme/utils';

const CF = '@acme/config';

/** The links out of apps end in hidden packages once apps is focused, so they are no longer counted. */
const FOCUSED_APPS_STATUS = 'Folder apps: 2 packages';

const APPS_IDS = ['docs', 'web'];

const ALL_IDS = ['docs', 'web', CF, UI, UT];

const FOCUSED_APPS_VIEW = {
  heading: 'apps',
  summary: '2 packages · 0 links inside',
  buttons: ['Collapse', 'Clear focus', 'Exclude folder'],
  packages: APPS_IDS
};

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder focus', () => {
  test(
    'GIVEN apps inspected, Focus folder narrows the graph to its packages and flips both Focus buttons',
    { annotation: C6 },
    async ({ graphFolderInspect, graphFolders, graphGrouping, graphPage }): Promise<void> => {
      await test.step('WHEN apps is tapped and Focus folder pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressAction('Focus folder');
      });

      await test.step('THEN only the apps packages are visible and packages is hidden', async (): Promise<void> => {
        await graphGrouping.expectVisibleIds(APPS_IDS);
        await graphFolders.expectFolderVisible('packages', false);
      });

      await test.step('AND the details button and the apps header button read Clear focus', async (): Promise<void> => {
        await graphFolderInspect.expectFolderView(FOCUSED_APPS_VIEW);
        await graphFolderInspect.expectHeaderFocusText('apps', 'Clear focus');
        await graphFolderInspect.expectHeaderFocusText('packages', 'Focus');
      });

      await test.step('AND the status counts only the links whose ends are both visible', async (): Promise<void> =>
        graphPage.expectStatus(FOCUSED_APPS_STATUS));
    }
  );

  test(
    'GIVEN a focused folder, Clear focus and Show all each bring every package back',
    { annotation: C6 },
    async ({ graphControls, graphFolderInspect, graphGrouping }): Promise<void> => {
      await test.step('WHEN apps is focused and Clear focus pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressAction('Focus folder');
        await graphGrouping.expectVisibleIds(APPS_IDS);
        await graphFolderInspect.pressAction('Clear focus');
      });

      await test.step('THEN all five packages are visible', async (): Promise<void> => graphGrouping.expectVisibleIds(ALL_IDS));

      await test.step('WHEN apps is focused again and Show all pressed', async (): Promise<void> => {
        await graphFolderInspect.pressAction('Focus folder');
        await graphGrouping.expectVisibleIds(APPS_IDS);
        await graphControls.showAll();
      });

      await test.step('THEN all five packages are visible', async (): Promise<void> => graphGrouping.expectVisibleIds(ALL_IDS));
    }
  );

  test(
    'GIVEN apps collapsed, the header Focus button expands it and focuses it',
    { annotation: C6 },
    async ({ graphFolderInspect, graphGrouping }): Promise<void> => {
      await test.step('WHEN the boards open with apps collapsed and the header Focus is pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['apps'] }), BOARDS);
        await graphFolderInspect.pressHeaderFocus('apps');
      });

      await test.step('THEN apps is expanded and only its packages are visible', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('apps', false);
        await graphGrouping.expectVisibleIds(APPS_IDS);
      });
    }
  );

  test(
    'GIVEN the grouped list, Space on the header Focus button focuses the folder and Space again clears it',
    { annotation: C6 },
    async ({ graphFolderInspect, graphGrouping, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the header Focus button is reached by the keyboard and Space pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphKeys.tabTo('apps (2)');
        await graphKeys.press('ArrowRight');
        await graphKeys.press('ArrowRight');
        await graphPage.pressKey('Space');
      });

      await test.step('THEN apps is focused', async (): Promise<void> => {
        await graphGrouping.expectVisibleIds(APPS_IDS);
        await graphFolderInspect.expectHeaderFocusText('apps', 'Clear focus');
      });

      await test.step('WHEN Space is pressed again THEN the focus clears', async (): Promise<void> => {
        await graphPage.pressKey('Space');
        await graphGrouping.expectVisibleIds(ALL_IDS);
        await graphFolderInspect.expectHeaderFocusText('apps', 'Focus');
      });
    }
  );

  test(
    'GIVEN a package focus, a folder focus replaces it and a package focus replaces that',
    { annotation: C6 },
    async ({ graphFolderInspect, graphGrouping, graphList }): Promise<void> => {
      await test.step('WHEN web is focused from the list', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.focusOn('web');
        await graphList.expectRowLocked('web');
        await graphFolderInspect.expectHeaderFocusText('apps', 'Focus');
      });

      await test.step('AND the packages header Focus is pressed', async (): Promise<void> =>
        graphFolderInspect.pressHeaderFocus('packages'));

      await test.step('THEN web is unlocked and the packages folder packages are visible', async (): Promise<void> => {
        await graphList.expectRowUnlocked('web');
        await graphGrouping.expectVisibleIds([CF, UI, UT]);
      });

      await test.step('WHEN ui is focused from the list THEN the folder focus label is back to Focus', async (): Promise<void> => {
        await graphList.focusOn(UI);
        await graphFolderInspect.expectHeaderFocusText('packages', 'Focus');
        await graphList.expectRowLocked(UI);
      });
    }
  );

  test(
    'GIVEN packages inspected, Exclude folder unchecks its group and drops the inspection',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphList }): Promise<void> => {
      await test.step('WHEN packages is tapped and Exclude folder pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('packages');
        await graphFolderInspect.pressAction('Exclude folder');
      });

      await test.step('THEN its group is unchecked and only apps is visible', async (): Promise<void> => {
        await graphList.expectGroupChecked('packages (3)', false);
        await graphGrouping.expectVisibleIds(APPS_IDS);
      });

      await test.step('AND nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));
    }
  );

  test(
    'GIVEN a focused folder inspected, turning Group by folder off clears the focus and the inspection',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphPage }): Promise<void> => {
      await test.step('WHEN apps is tapped, focused and Group by folder unchecked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressAction('Focus folder');
        await graphGrouping.expectVisibleIds(APPS_IDS);
        await graphGrouping.setGrouped(false);
      });

      await test.step('THEN nothing is inspected and all five packages are visible', async (): Promise<void> => {
        await graphDetails.expectInspection(NO_INSPECTION);
        await graphGrouping.expectVisibleIds(ALL_IDS);
      });

      await test.step('AND the details panel is empty and the status blank', async (): Promise<void> => {
        await graphDetails.expectEmpty();
        await graphPage.expectStatus('');
      });
    }
  );

  test(
    'GIVEN a focused folder, pressing a member inspects the package and keeps the focus',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping }): Promise<void> => {
      await test.step('WHEN apps is tapped, focused and the web member pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressAction('Focus folder');
        await graphFolderInspect.pressMember('web');
      });

      await test.step('THEN web is inspected and the apps packages stay visible', async (): Promise<void> => {
        await graphDetails.expectInspection(packageInspection('web'));
        await graphGrouping.expectVisibleIds(APPS_IDS);
      });
    }
  );
});
