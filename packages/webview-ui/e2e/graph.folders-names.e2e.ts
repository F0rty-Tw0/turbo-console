import type { FolderFacts, FolderLinkFacts } from './common/graph-folders.type.ts';
import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB } from './test/stubs/graph-folder-facts.stub.ts';
import { bothCachedBoardsState } from './test/utils/graph-boards.spec.util.ts';
import { awkwardNamesState, collapsedSavedState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';

const C8 = { description: 'M4-4 C8', type: 'requirement' };

const BOARDS = placedBoardsState();

const CACHED_BOARDS = bothCachedBoardsState();

const AWKWARD = awkwardNamesState();

const AWKWARD_KEYS = ['', '(root)', '__proto__', 'tools'];

const awkwardFolder = (folder: string, name: string): FolderFacts => {
  const facts: FolderFacts = { folder, isCollapsed: true, isVisible: true, packages: [name] };

  return facts;
};

const AWKWARD_FOLDERS: FolderFacts[] = [
  awkwardFolder('', 'solo'),
  awkwardFolder('(root)', 'x'),
  awkwardFolder('__proto__', 'a'),
  awkwardFolder('tools', 'constructor')
];

const AWKWARD_LINKS: FolderLinkFacts[] = [
  { source: '', target: '(root)', count: 1 },
  { source: 'tools', target: '__proto__', count: 1 },
  { source: '(root)', target: '__proto__', count: 1 }
];

const COLLAPSED_WALK: FocusStep[] = [
  { key: 'ArrowRight', focus: 'Expand folder apps' },
  { key: 'ArrowRight', focus: 'Expand folder apps' }
];

const FLAT_WALK: FocusStep[] = [{ key: 'ArrowRight', focus: 'apps (2)' }];

const GROUPED_WALK: FocusStep[] = [{ key: 'ArrowRight', focus: 'Collapse folder apps' }];

test.describe('FEATURE: folder names and keys', () => {
  test('GIVEN the collapsed boards list, ArrowRight reaches the header button once and Space and Enter press it', async ({
    graphFolders,
    graphGrouping,
    graphHost,
    graphKeys,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with apps collapsed', async (): Promise<void> =>
      graphPage.open({ savedState: collapsedSavedState(BOARDS.hash, ['apps']) }));

    await test.step('AND the boards state is sent and the apps group checkbox is reached by Tab', async (): Promise<void> => {
      await graphHost.sendState(BOARDS);
      await graphKeys.tabTo('apps (2)');
    });

    const walked = await test.step('AND ArrowRight is pressed twice', async (): Promise<FocusStep[]> =>
      graphKeys.walk(COLLAPSED_WALK));

    await test.step('THEN the header button took focus and the second press stayed on it', (): void =>
      expect(walked).toEqual(COLLAPSED_WALK));

    await test.step('WHEN Space is pressed', async (): Promise<void> => graphKeys.press('Space'));

    await test.step('THEN apps is expanded', async (): Promise<void> => {
      await graphGrouping.expectFolderCollapsed('apps', false);
      await graphFolders.expectListToggle('apps', true);
    });

    await test.step('WHEN Enter is pressed', async (): Promise<void> => graphKeys.press('Enter'));

    await test.step('THEN apps is collapsed again', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', true));
  });

  test('GIVEN the flat boards list, the header has one cell, and grouping it adds the header button to the arrow walk', async ({
    graphGrouping,
    graphHost,
    graphKeys,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened flat', async (): Promise<void> => graphPage.open());

    await test.step('AND the boards state is sent and the apps group checkbox is reached by Tab', async (): Promise<void> => {
      await graphHost.sendState(CACHED_BOARDS);
      await graphKeys.tabTo('apps (2)');
    });

    const flatWalk = await test.step('AND ArrowRight is pressed', async (): Promise<FocusStep[]> => graphKeys.walk(FLAT_WALK));

    await test.step('THEN focus did not move', (): void => expect(flatWalk).toEqual(FLAT_WALK));

    await test.step('WHEN Group by folder is checked and the apps group checkbox is reached again', async (): Promise<void> => {
      await graphGrouping.setGrouped(true);
      await graphKeys.tabTo('apps (2)');
    });

    const groupedWalk = await test.step('AND ArrowRight is pressed', async (): Promise<FocusStep[]> => graphKeys.walk(GROUPED_WALK));

    await test.step('THEN the header button took focus', (): void => expect(groupedWalk).toEqual(GROUPED_WALK));
  });

  test('GIVEN the Tab stop on a header button, ungrouping gives the stop back to the list so Tab still reaches it', async ({
    graphGrouping,
    graphHost,
    graphKeys,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the cached boards open grouped', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(CACHED_BOARDS.hash) }));

    await test.step('AND the boards state is sent and the apps group checkbox is reached by Tab', async (): Promise<void> => {
      await graphHost.sendState(CACHED_BOARDS);
      await graphKeys.tabTo('apps (2)');
    });

    const walked = await test.step('AND ArrowRight is pressed', async (): Promise<FocusStep[]> => graphKeys.walk(GROUPED_WALK));

    await test.step('THEN the Tab stop sits on the header button', (): void => expect(walked).toEqual(GROUPED_WALK));

    await test.step('WHEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

    await test.step('THEN Tab reaches the apps group checkbox again', async (): Promise<void> => graphKeys.tabTo('apps (2)'));
  });

  test(
    'GIVEN apps collapsed from the list, reopening restores it collapsed with packages expanded',
    { annotation: C8 },
    async ({ graphFolders, graphGrouping, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the boards open grouped', async (): Promise<void> =>
        graphPage.open({ savedState: groupedSavedState(BOARDS.hash) }));

      await test.step('AND the boards state is sent and apps is collapsed by its list button', async (): Promise<void> => {
        await graphHost.sendState(BOARDS);
        await graphFolders.toggleInList('apps', true);
      });

      await test.step('THEN the view saved apps as collapsed', async (): Promise<void> => {
        await graphGrouping.expectCollapsedSaved(['apps']);
        await graphHost.expectViewSaved();
      });

      await test.step('WHEN the page is reopened with the saved view and the state is sent', async (): Promise<void> => {
        await graphHost.reopen();
        await graphHost.sendState(BOARDS);
      });

      await test.step('THEN apps is collapsed, packages is expanded and grouping is still on', async (): Promise<void> => {
        await graphFolders.expectFolders([{ ...APPS_FOLDER_STUB, isCollapsed: true }, PACKAGES_FOLDER_STUB]);
        await graphGrouping.expectGrouped(true);
      });
    }
  );

  test(
    'GIVEN folders named (root), __proto__ and a root package, all four collapse, link, toggle and restore under their own names',
    { annotation: C8 },
    async ({ graphFolders, graphGrouping, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page opens grouped with all four folders collapsed', async (): Promise<void> =>
        graphPage.open({ savedState: collapsedSavedState(AWKWARD.hash, AWKWARD_KEYS) }));

      await test.step('AND the awkward-names state is sent', async (): Promise<void> => graphHost.sendState(AWKWARD));

      await test.step('THEN four collapsed folders are keyed by their own names', async (): Promise<void> =>
        graphFolders.expectFolders(AWKWARD_FOLDERS));

      await test.step('AND the root and the real (root) folder have different list buttons', async (): Promise<void> => {
        await graphFolders.expectListToggle('', false);
        await graphFolders.expectListToggle('(root)', false);
      });

      await test.step('AND three folder links join them', async (): Promise<void> => graphFolders.expectFolderLinks(AWKWARD_LINKS));

      await test.step('WHEN the __proto__ folder is expanded by its list button', async (): Promise<void> =>
        graphFolders.toggleInList('__proto__', false));

      await test.step('THEN only that folder is expanded', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('__proto__', false);
        await graphGrouping.expectFolderCollapsed('tools', true);
      });

      await test.step('WHEN the __proto__ folder is collapsed again', async (): Promise<void> =>
        graphFolders.toggleInList('__proto__', true));

      await test.step('THEN the view saved all four as collapsed', async (): Promise<void> => {
        await graphGrouping.expectCollapsedSaved(AWKWARD_KEYS);
        await graphHost.expectViewSaved();
      });

      await test.step('WHEN the page is reopened with the saved view and the state is sent', async (): Promise<void> => {
        await graphHost.reopen();
        await graphHost.sendState(AWKWARD);
      });

      await test.step('THEN all four folders are collapsed again', async (): Promise<void> =>
        graphFolders.expectFolders(AWKWARD_FOLDERS));
    }
  );
});
