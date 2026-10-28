import { expect, test } from './graph-task.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { folderInspection } from './test/utils/graph-inspection.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';

const U4A = { description: 'U4a D7 title', type: 'requirement' };

const BOARDS = placedBoardsState();

const APPS_VIEW = {
  heading: 'apps',
  summary: '2 packages · 0 links inside',
  buttons: ['Collapse', 'Focus folder', 'Exclude folder'],
  packages: ['docs', 'web']
};

test.describe('FEATURE: the folder title button', () => {
  test(
    'GIVEN the grouped boards, the apps title takes the pointer and carries its full name as its title',
    { annotation: U4A },
    async ({ graphFolderInspect, graphWidgetInput }): Promise<void> => {
      await test.step('WHEN the grouped boards open', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS));

      await test.step('THEN the apps title takes the pointer', async (): Promise<void> => graphWidgetInput.expectTitleHit('apps'));

      await test.step('AND its title attribute is the full name', async (): Promise<void> => {
        await expect(graphWidgetInput.titleOf('apps')).toHaveAttribute('title', 'apps');
      });
    }
  );

  test(
    'GIVEN the grouped boards, a click on the apps title inspects the folder and the graph keeps focus',
    { annotation: U4A },
    async ({ graphDetails, graphFolderInspect, graphWidgetInput }): Promise<void> => {
      await test.step('GIVEN the grouped boards open', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS));

      await test.step('WHEN the apps title is clicked', async (): Promise<void> => graphWidgetInput.clickTitle('apps'));

      await test.step('THEN the apps folder is inspected', async (): Promise<void> => {
        await graphDetails.expectInspection(folderInspection('apps'));
        await graphFolderInspect.expectFolderView(APPS_VIEW);
      });

      await test.step('AND the graph has focus', async (): Promise<void> => graphWidgetInput.expectFocusOnContainer());
    }
  );

  test(
    'GIVEN the grouped boards, a double click on the apps title collapses the folder and a second one expands it',
    { annotation: U4A },
    async ({ graphFolderInspect, graphGrouping, graphWidgetInput }): Promise<void> => {
      await test.step('GIVEN the grouped boards open', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS));

      await test.step('WHEN the apps title is double clicked THEN apps collapses', async (): Promise<void> => {
        await graphWidgetInput.dblclickTitle('apps');
        await graphGrouping.expectFolderCollapsed('apps', true);
      });

      await test.step('WHEN the collapsed apps title is double clicked THEN apps expands', async (): Promise<void> => {
        await graphWidgetInput.dblclickTitle('apps');
        await graphGrouping.expectFolderCollapsed('apps', false);
      });
    }
  );

  test(
    'GIVEN the apps title focused, Enter twice inspects apps, never collapses it and leaves focus on the title',
    { annotation: U4A },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphWidgetInput }): Promise<void> => {
      await test.step('GIVEN the grouped boards open', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS));

      await test.step('WHEN Enter is pressed twice on the focused apps title', async (): Promise<void> =>
        graphWidgetInput.pressEnterTwiceOnTitle('apps'));

      await test.step('THEN apps is inspected and stays expanded', async (): Promise<void> => {
        await graphDetails.expectInspection(folderInspection('apps'));
        await graphGrouping.expectFolderCollapsed('apps', false);
      });

      await test.step('AND the title keeps focus', async (): Promise<void> => graphWidgetInput.expectTitleFocused('apps'));
    }
  );

  test(
    'GIVEN a switch to flat still laying out, a click on the apps title inspects nothing and the graph has focus',
    { annotation: U4A },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphWidgetInput }): Promise<void> => {
      await test.step('GIVEN the grouped boards open with the flat layout held and Group by folder is unchecked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS, { workers: 'held' });
        await graphGrouping.setGrouped(false);
      });

      await test.step('WHEN the apps title, still drawn, is clicked', async (): Promise<void> => graphWidgetInput.clickTitle('apps'));

      await test.step('THEN no folder is inspected', async (): Promise<void> => graphDetails.expectInspection({ kind: 'none' }));

      await test.step('AND the graph has focus', async (): Promise<void> => graphWidgetInput.expectFocusOnContainer());
    }
  );

  test(
    'GIVEN apps collapsed, a tap on its node centre inspects the folder and the graph has focus',
    { annotation: U4A },
    async ({ graphDetails, graphFolderInspect, graphFolders, graphWidgetInput }): Promise<void> => {
      await test.step('GIVEN the boards open with apps collapsed', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(BOARDS.hash, { collapsed: ['apps'] }), BOARDS));

      await test.step('WHEN the apps node centre is tapped', async (): Promise<void> => graphFolders.tapFolder('apps'));

      await test.step('THEN the apps folder is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(folderInspection('apps')));

      await test.step('AND the graph has focus', async (): Promise<void> => graphWidgetInput.expectFocusOnContainer());
    }
  );
});
