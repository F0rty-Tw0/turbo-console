import type { FolderLinkFacts } from './common/graph-folders.type.ts';
import { test } from './graph.fixture.ts';
import { APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB } from './test/stubs/graph-folder-facts.stub.ts';
import { PACKAGES_FOLDER_MEMBERS } from './test/utils/graph-boards.spec.util.ts';
import { collapsedSavedState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const C5 = { description: 'M4-4 C5', type: 'requirement' };

const BOARDS = placedBoardsState();

const ALL_FIVE = ['@acme/config', '@acme/ui', '@acme/utils', 'docs', 'web'];

const APPS_LINKS: FolderLinkFacts[] = [
  { source: 'apps', target: '@acme/ui', count: 2 },
  { source: 'apps', target: '@acme/utils', count: 1 }
];

const PACKAGES_COLLAPSED = { ...PACKAGES_FOLDER_STUB, isCollapsed: true };

test.describe('FEATURE: folder collapse', () => {
  test(
    'GIVEN both boards folders collapsed, one folder link apps to packages counts 3',
    { annotation: C5 },
    async ({ graphFolderPackages, graphFolders, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the boards open grouped with both folders collapsed', async (): Promise<void> =>
        graphPage.open({ savedState: collapsedSavedState(BOARDS.hash, ['apps', 'packages']) }));

      await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

      await test.step('THEN one folder link apps to packages counts 3', async (): Promise<void> =>
        graphFolders.expectFolderLinks([{ source: 'apps', target: 'packages', count: 3 }]));

      await test.step('AND the package link ui to utils inside packages is hidden', async (): Promise<void> =>
        graphFolderPackages.expectLinkHidden('@acme/ui', '@acme/utils'));
    }
  );

  test(
    'GIVEN only apps collapsed, its links split by package and the package link between the packages stays drawn',
    { annotation: C5 },
    async ({ graphFolderPackages, graphFolders, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the boards open grouped with apps collapsed', async (): Promise<void> =>
        graphPage.open({ savedState: collapsedSavedState(BOARDS.hash, ['apps']) }));

      await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

      await test.step('THEN apps links to ui twice and to utils once', async (): Promise<void> =>
        graphFolders.expectFolderLinks(APPS_LINKS));

      await test.step('AND the link between ui and utils is still drawn', async (): Promise<void> =>
        graphFolderPackages.expectLinkDrawn('@acme/ui', '@acme/utils'));

      await test.step('AND the link from web to ui, a package link into apps, is hidden', async (): Promise<void> =>
        graphFolderPackages.expectLinkHidden('web', '@acme/ui'));
    }
  );

  test('GIVEN the grouped boards, the list header collapses and expands a folder without moving or hiding a package', async ({
    graphFolderPackages,
    graphFolders,
    graphGrouping,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(BOARDS.hash) }));

    await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

    await test.step('THEN both folders are expanded and the packages header reads Collapse', async (): Promise<void> => {
      await graphFolders.expectFolders([APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB]);
      await graphFolders.expectListToggle('packages', true);
    });

    await test.step('WHEN the packages header button collapses it', async (): Promise<void> =>
      graphFolders.toggleInList('packages', true));

    await test.step('THEN packages is collapsed, its button reads Expand and apps is untouched', async (): Promise<void> => {
      await graphFolders.expectFolders([APPS_FOLDER_STUB, PACKAGES_COLLAPSED]);
      await graphFolders.expectListToggle('packages', false);
    });

    await test.step('AND all five packages stay visible, the folder ones flagged collapsed', async (): Promise<void> => {
      await graphGrouping.expectVisibleIds(ALL_FIVE);
      await graphFolderPackages.expectFlags(PACKAGES_FOLDER_MEMBERS, { isVisible: true, isCollapsed: true });
    });

    await test.step('WHEN the packages header button expands it again', async (): Promise<void> =>
      graphFolders.toggleInList('packages', false));

    await test.step('THEN both folders are expanded and no package is flagged collapsed', async (): Promise<void> => {
      await graphFolders.expectFolders([APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB]);
      await graphFolders.expectListToggle('packages', true);
      await graphFolderPackages.expectFlags(ALL_FIVE, { isVisible: true, isCollapsed: false });
    });

    await test.step('AND no positions were posted for the toggles', async (): Promise<void> => graphHost.expectNoPositionsPosted());
  });

  test('GIVEN the grouped boards with no flat layout cached, a quick uncheck and recheck of Group by folder keeps the list header toggles', async ({
    graphFolders,
    graphGrouping,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with held workers', async (): Promise<void> =>
      graphPage.open({ workers: 'held', savedState: groupedSavedState(BOARDS.hash) }));

    await test.step('AND the boards state is sent with only its grouped layout cached', async (): Promise<void> =>
      graphHost.sendState(BOARDS));

    await test.step('THEN the apps header reads Collapse', async (): Promise<void> => graphFolders.expectListToggle('apps', true));

    await test.step('WHEN Group by folder is unchecked and checked again before the flat layout lands', async (): Promise<void> => {
      await graphGrouping.setGrouped(false);
      await graphGrouping.setGrouped(true);
    });

    await test.step('THEN the apps header still reads Collapse', async (): Promise<void> =>
      graphFolders.expectListToggle('apps', true));
  });

  test('GIVEN apps collapsed, a double tap on its node expands it and a double tap on its box padding collapses it', async ({
    graphCanvas,
    graphFolders,
    graphGrouping,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with apps collapsed', async (): Promise<void> =>
      graphPage.open({ savedState: collapsedSavedState(BOARDS.hash, ['apps']) }));

    await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> => {
      await graphPage.pressButton(FIT_LABEL);
      await graphCanvas.expectAllNodesInView();
    });

    await test.step('AND the collapsed apps node is double tapped', async (): Promise<void> => graphFolders.doubleTapFolder('apps'));

    await test.step('THEN apps is expanded', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', false));

    await test.step('WHEN the apps box padding is double tapped', async (): Promise<void> => graphFolders.doubleTapBoxPadding('apps'));

    await test.step('THEN apps is collapsed again', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', true));
  });

  test('GIVEN a package unticked in a box, dragging the box moves every package once and the collapsed node centres on them', async ({
    graphCanvas,
    graphFolderPackages,
    graphFolders,
    graphHost,
    graphPage
  }): Promise<void> => {
    const opened = groupedSavedState(BOARDS.hash);
    const saved = { ...opened, hidden: ['@acme/ui'] };

    await test.step('WHEN the boards open grouped with ui unticked', async (): Promise<void> => graphPage.open({ savedState: saved }));

    await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> => {
      await graphPage.pressButton(FIT_LABEL);
      await graphCanvas.expectAllNodesInView();
    });

    await test.step('AND the packages box is dragged by 60 and 40 pixels', async (): Promise<void> =>
      graphFolderPackages.dragBox('packages', 60, 40));

    await test.step('THEN all three packages, the unticked one too, moved once', async (): Promise<void> =>
      graphFolderPackages.expectDragMoved(PACKAGES_FOLDER_MEMBERS));

    await test.step('AND the apps packages stayed', async (): Promise<void> => graphFolderPackages.expectDragStill(['docs', 'web']));

    await test.step('WHEN the packages folder is collapsed', async (): Promise<void> => graphFolders.toggleInList('packages', true));

    await test.step('THEN its node sits at the centre of its three packages', async (): Promise<void> =>
      graphFolderPackages.expectCollapsedCentred('packages'));

    await test.step('AND the last positions post names exactly the five packages', async (): Promise<void> =>
      graphHost.expectPositionsPosted(BOARDS.hash, ALL_FIVE));
  });
});
