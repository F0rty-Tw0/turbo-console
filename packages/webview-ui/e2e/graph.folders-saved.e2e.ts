import type { FolderStatusRow } from './common/graph-folders.type.ts';
import { expect, test } from './graph.fixture.ts';
import { protoFolderState, rootFoldersState } from './test/utils/graph-boards.spec.util.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { folderInspection, packageInspection } from './test/utils/graph-inspection.spec.util.ts';
import { groupedSavedState, savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphFocus, GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const C8 = { description: 'M4-4 C8', type: 'requirement' };

const FOCUS_3 = { description: 'M4-4 Review Focus 3', type: 'requirement' };

const FOCUS_4 = { description: 'M4-4 Review Focus 4', type: 'requirement' };

const BOARDS = placedBoardsState();

const PROTO = protoFolderState();

const ROOT = rootFoldersState();

const UI = '@acme/ui';

const UT = '@acme/utils';

const CF = '@acme/config';

const APPS_IDS = ['docs', 'web'];

const ALL_IDS = ['docs', 'web', CF, UI, UT];

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

const PROTO_ROWS: FolderStatusRow[] = [
  {
    name: 'a __proto__ folder collapsed and inspected',
    collapsed: ['__proto__'],
    folder: '__proto__',
    status: 'Folder __proto__: 1 package, 1 link in'
  },
  {
    name: 'the folder holding the constructor package inspected',
    collapsed: [],
    folder: 'x',
    status: 'Folder x: 2 packages, 1 link out'
  }
];

const ROOT_ROWS: FolderStatusRow[] = [
  { name: 'the root folder inspected', collapsed: [], folder: '', status: 'Folder (root): 1 package, 1 link in' },
  {
    name: 'a real (root) folder inspected',
    collapsed: [],
    folder: '(root)',
    status: 'Folder ./(root): 1 package, 1 link in, 1 link out'
  }
];

const folderFocusOf = (folder: string): GraphFocus => {
  const focus: GraphFocus = { kind: 'folder', folder };

  return focus;
};

test.describe('FEATURE: folder state restored', () => {
  test(
    'GIVEN a grouped view with packages collapsed and apps inspected and focused, reopening restores all of it',
    { annotation: C8 },
    async ({ graphDetails, graphFolderInspect, graphFolders, graphGrouping, graphHost }): Promise<void> => {
      await test.step('WHEN packages is collapsed, apps inspected and focused, and the view saved', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolders.toggleInList('packages', true);
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressAction('Focus folder');
        await graphGrouping.expectVisibleIds(APPS_IDS);
        await graphHost.expectViewSaved();
      });

      await test.step('AND the page is reopened and the boards sent', async (): Promise<void> => {
        await graphHost.reopen();
        await graphHost.sendState(BOARDS);
      });

      await test.step('THEN it is grouped with packages collapsed', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectFolderCollapsed('packages', true);
      });

      await test.step('AND apps is inspected and focused', async (): Promise<void> => {
        await graphDetails.expectInspection(folderInspection('apps'));
        await graphGrouping.expectVisibleIds(APPS_IDS);
        await graphFolderInspect.expectFolderView({
          heading: 'apps',
          summary: '2 packages · 0 links inside',
          buttons: ['Collapse', 'Clear focus', 'Exclude folder'],
          packages: APPS_IDS
        });
      });
    }
  );

  test(
    'GIVEN apps inspected, the saved view holds the folder and no selection, link or trace',
    { annotation: C8 },
    async ({ graphFolderInspect, graphHost }): Promise<void> => {
      await graphFolderInspect.open(grouped(), BOARDS);
      await graphFolderInspect.tapFolder('apps');
      await graphHost.expectViewSaved();

      const saved = await graphHost.reopen();

      expect(saved).toMatchObject({ selected: null, link: null, trace: null, folder: 'apps' });
    }
  );

  test(
    'GIVEN an old saved string focus at depth 2, it restores as a package focus at that depth',
    { annotation: C8 },
    async ({ graphControls, graphFolderInspect, graphGrouping, graphList }): Promise<void> => {
      const fresh = groupedSavedState(BOARDS.hash);
      const saved = { ...fresh, focus: 'web', depth: 2 };

      await test.step('WHEN the boards open with that saved view', async (): Promise<void> => graphFolderInspect.open(saved, BOARDS));

      await test.step('THEN web is locked, depth reads 2 and web with its closure is visible', async (): Promise<void> => {
        await graphList.expectRowLocked('web');
        await graphControls.expectDepthValue('2');
        await graphGrouping.expectVisibleIds(['web', UI, UT]);
      });
    }
  );

  test(
    'GIVEN both a selected package and a folder saved, the folder is restored',
    { annotation: C8 },
    async ({ graphDetails, graphFolderInspect }): Promise<void> => {
      await test.step('WHEN the boards open with web selected and packages inspected', async (): Promise<void> =>
        graphFolderInspect.open(grouped({ selected: 'web', folder: 'packages' }), BOARDS));

      await test.step('THEN packages is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(folderInspection('packages')));
    }
  );

  test(
    'GIVEN a saved folder that no longer exists, nothing is inspected and nothing is hidden',
    { annotation: C8 },
    async ({ graphDetails, graphFolderInspect, graphGrouping }): Promise<void> => {
      const zzzFocus = folderFocusOf('zzz');
      const saved = grouped({ folder: 'zzz', focus: zzzFocus });

      await test.step('WHEN the boards open with that saved view', async (): Promise<void> => graphFolderInspect.open(saved, BOARDS));

      await test.step('THEN nothing is inspected and all five packages are visible', async (): Promise<void> => {
        await graphDetails.expectInspection(NO_INSPECTION);
        await graphGrouping.expectVisibleIds(ALL_IDS);
      });
    }
  );

  test(
    'GIVEN a saved folder whose packages are all hidden, the saved selection is restored instead',
    { annotation: C8 },
    async ({ graphDetails, graphFolderInspect }): Promise<void> => {
      const saved = grouped({ hidden: [UI, UT, CF], folder: 'packages', selected: 'web' });

      await test.step('WHEN the boards open with that saved view', async (): Promise<void> => graphFolderInspect.open(saved, BOARDS));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));
    }
  );

  test(
    'GIVEN a saved folder with one hidden member, the rebuilt folder view marks that member hidden',
    { annotation: C8 },
    async ({ graphFolderInspect }): Promise<void> => {
      await test.step('WHEN the boards open with apps inspected and docs hidden', async (): Promise<void> =>
        graphFolderInspect.open(grouped({ folder: 'apps', hidden: ['docs'] }), BOARDS));

      await test.step('THEN docs reads hidden and is aria-disabled, and web is neither', async (): Promise<void> => {
        await graphFolderInspect.expectMemberHidden('docs', true);
        await graphFolderInspect.expectMemberHidden('web', false);
      });
    }
  );

  test(
    'GIVEN a saved selection inside a collapsed folder, the folder expands and the other stays as saved',
    { annotation: C8 },
    async ({ graphDetails, graphFolderInspect, graphGrouping }): Promise<void> => {
      await test.step('WHEN the boards open with packages collapsed and ui selected', async (): Promise<void> =>
        graphFolderInspect.open(grouped({ collapsed: ['packages'], selected: UI }), BOARDS));

      await test.step('THEN ui is inspected and both folders are expanded', async (): Promise<void> => {
        await graphDetails.expectInspection(packageInspection(UI));
        await graphGrouping.expectFolderCollapsed('packages', false);
        await graphGrouping.expectFolderCollapsed('apps', false);
      });
    }
  );

  for (const row of PROTO_ROWS) {
    test(
      `GIVEN ${row.name}, the prototype-named keys are read as keys and the status counts them`,
      { annotation: FOCUS_4 },
      async ({ graphDetails, graphFolderInspect, graphPage }): Promise<void> => {
        await test.step('WHEN the prototype-named graph opens with the saved view', async (): Promise<void> =>
          graphFolderInspect.open(savedWith(PROTO.hash, { collapsed: row.collapsed, folder: row.folder }), PROTO));

        await test.step('THEN the folder is inspected and its status reads', async (): Promise<void> => {
          await graphDetails.expectInspection(folderInspection(row.folder));
          await graphPage.expectStatus(row.status);
        });
      }
    );
  }

  test(
    'GIVEN a __proto__ folder saved as the focus, only its package is visible',
    { annotation: FOCUS_4 },
    async ({ graphFolderInspect, graphGrouping }): Promise<void> => {
      const protoFocus = folderFocusOf('__proto__');
      const saved = savedWith(PROTO.hash, { focus: protoFocus });

      await test.step('WHEN the prototype-named graph opens with that saved view', async (): Promise<void> =>
        graphFolderInspect.open(saved, PROTO));

      await test.step('THEN only a is visible', async (): Promise<void> => graphGrouping.expectVisibleIds(['a']));
    }
  );

  for (const row of ROOT_ROWS) {
    test(
      `GIVEN ${row.name}, its title and key differ from the other root folder's`,
      { annotation: FOCUS_3 },
      async ({ graphDetails, graphFolderInspect, graphGrouping, graphPage }): Promise<void> => {
        await test.step('WHEN the root graph opens with the saved view', async (): Promise<void> =>
          graphFolderInspect.open(savedWith(ROOT.hash, { collapsed: row.collapsed, folder: row.folder }), ROOT));

        await test.step('THEN the folder is inspected and its status reads', async (): Promise<void> => {
          await graphDetails.expectInspection(folderInspection(row.folder));
          await graphPage.expectStatus(row.status);
        });

        await test.step('AND the root folder and the real (root) folder are both drawn under their own keys', async (): Promise<void> =>
          graphGrouping.expectFolderKeys(['', '(root)', 'apps']));
      }
    );
  }
});
