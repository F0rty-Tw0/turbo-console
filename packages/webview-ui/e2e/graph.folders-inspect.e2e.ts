import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { folderInspection, packageInspection, pickingInspection } from './test/utils/graph-inspection.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const C6 = { description: 'M4-4 C6', type: 'requirement' };

const BOARDS = placedBoardsState();

const UI = '@acme/ui';

const UT = '@acme/utils';

const CF = '@acme/config';

const APPS_STATUS = 'Folder apps: 2 packages, 3 links out';

const APPS_VIEW = {
  heading: 'apps',
  summary: '2 packages · 0 links inside',
  buttons: ['Collapse', 'Focus folder', 'Exclude folder'],
  packages: ['docs', 'web']
};

const HEADER_WALK: FocusStep[] = [
  { key: 'ArrowRight', focus: 'Collapse folder apps' },
  { key: 'ArrowRight', focus: 'Focus folder apps' },
  { key: 'ArrowRight', focus: 'Focus folder apps' },
  { key: 'ArrowDown', focus: 'Focus docs' }
];

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder inspection', () => {
  test(
    'GIVEN grouped boards, tapping the apps box selects the folder and paints the folder row',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphProbe, graphPage }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step('AND the apps box is tapped in its padding', async (): Promise<void> => graphFolderInspect.tapFolder('apps'));

      await test.step('THEN apps is inspected', async (): Promise<void> => graphDetails.expectInspection(folderInspection('apps')));

      await test.step('AND the status reads the counts', async (): Promise<void> => graphPage.expectStatus(APPS_STATUS));

      await test.step('AND apps is selected and packages normal', async (): Promise<void> => {
        await graphFolderInspect.expectFolderState('apps', 'selected');
        await graphFolderInspect.expectFolderState('packages', 'normal');
      });

      await test.step('AND config is dimmed, the far ends and apps packages are normal', async (): Promise<void> =>
        graphProbe.expectNodeStates({ docs: 'normal', web: 'normal', [CF]: 'dimmed', [UI]: 'normal', [UT]: 'normal' }));

      await test.step('AND the details view lists the folder', async (): Promise<void> =>
        graphFolderInspect.expectFolderView(APPS_VIEW));
    }
  );

  test(
    'GIVEN both folders collapsed, tapping the apps node paints the folder row and its link',
    { annotation: C6 },
    async ({ graphFolderInspect, graphPage }): Promise<void> => {
      await test.step('WHEN the boards open with both folders collapsed', async (): Promise<void> =>
        graphFolderInspect.open(grouped({ collapsed: ['apps', 'packages'] }), BOARDS));

      await test.step('AND the apps node is tapped', async (): Promise<void> => graphFolderInspect.tapFolder('apps'));

      await test.step('THEN apps is selected, packages normal and the link between them highlighted', async (): Promise<void> => {
        await graphFolderInspect.expectFolderState('apps', 'selected');
        await graphFolderInspect.expectFolderState('packages', 'normal');
        await graphFolderInspect.expectFolderLinkState('apps', 'packages', 'highlighted');
      });

      await test.step('AND the status reads the counts', async (): Promise<void> => graphPage.expectStatus(APPS_STATUS));
    }
  );

  test(
    'GIVEN apps inspected, the details Collapse and Expand toggle it and the inspection stays',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping }): Promise<void> => {
      await test.step('WHEN apps is tapped and Collapse pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressAction('Collapse');
      });

      await test.step('THEN apps is collapsed, still inspected, and the button reads Expand', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('apps', true);
        await graphDetails.expectInspection(folderInspection('apps'));
        await graphFolderInspect.expectFolderView({ ...APPS_VIEW, buttons: ['Expand', 'Focus folder', 'Exclude folder'] });
      });

      await test.step('WHEN Expand is pressed THEN apps is expanded and the button reads Collapse again', async (): Promise<void> => {
        await graphFolderInspect.pressAction('Expand');
        await graphGrouping.expectFolderCollapsed('apps', false);
        await graphFolderInspect.expectFolderView(APPS_VIEW);
      });
    }
  );

  test(
    'GIVEN apps inspected, Enter on the canvas toggles it and Escape clears the inspection',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphPage }): Promise<void> => {
      await test.step('WHEN apps is tapped and Enter pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphPage.pressKey('Enter');
      });

      await test.step('THEN apps is collapsed and its details did not open as a package', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('apps', true);
        await graphDetails.expectInspection(folderInspection('apps'));
      });

      await test.step('WHEN Enter is pressed again THEN apps is expanded', async (): Promise<void> => {
        await graphPage.pressKey('Enter');
        await graphGrouping.expectFolderCollapsed('apps', false);
      });

      await test.step('WHEN Escape is pressed THEN nothing is inspected', async (): Promise<void> => {
        await graphPage.pressKey('Escape');
        await graphDetails.expectInspection(NO_INSPECTION);
      });
    }
  );

  test(
    'GIVEN packages collapsed, picking a package inside it from the list expands its folder',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphList }): Promise<void> => {
      await test.step('WHEN the boards open with packages collapsed and the ui package is picked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['packages'] }), BOARDS);
        await graphList.pick(UI);
      });

      await test.step('THEN packages and apps are expanded and ui is inspected', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('packages', false);
        await graphGrouping.expectFolderCollapsed('apps', false);
        await graphDetails.expectInspection(packageInspection(UI));
      });
    }
  );

  test(
    'GIVEN a package inspected, collapsing its folder from the list header inspects the folder',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphFolders, graphList }): Promise<void> => {
      await test.step('WHEN ui is picked and the packages header is collapsed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.pick(UI);
        await graphFolders.toggleInList('packages', true);
      });

      await test.step('THEN the packages folder is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(folderInspection('packages')));
    }
  );

  test(
    'GIVEN a package outside a folder inspected, collapsing that folder keeps the package',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphFolders, graphGrouping, graphList }): Promise<void> => {
      await test.step('WHEN web is picked and the packages header is collapsed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.pick('web');
        await graphFolders.toggleInList('packages', true);
      });

      await test.step('THEN packages is collapsed and web is still inspected', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('packages', true);
        await graphDetails.expectInspection(packageInspection('web'));
      });
    }
  );

  test(
    'GIVEN a trace being picked from web, collapsing apps cancels it and inspects the folder',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphFolders, graphList, graphTrace }): Promise<void> => {
      await test.step('WHEN web is picked, Start trace pressed and apps collapsed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.pick('web');
        await graphDetails.startTrace();
        await graphFolders.toggleInList('apps', true);
      });

      await test.step('THEN apps is inspected and no picking hint shows', async (): Promise<void> => {
        await graphDetails.expectInspection(folderInspection('apps'));
        await graphTrace.expectHint(null);
      });
    }
  );

  test(
    'GIVEN a trace being picked, taps on a collapsed node and on a box padding change nothing',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphList }): Promise<void> => {
      await test.step('WHEN web is picked and Start trace pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['packages'] }), BOARDS);
        await graphList.pick('web');
        await graphDetails.startTrace();
      });

      await test.step('AND the collapsed packages node is tapped THEN the picking stays', async (): Promise<void> => {
        await graphFolderInspect.tapFolder('packages');
        await graphDetails.expectInspection(pickingInspection('web', false));
      });

      await test.step('AND the apps box padding is tapped THEN the picking stays', async (): Promise<void> => {
        await graphFolderInspect.tapFolder('apps');
        await graphDetails.expectInspection(pickingInspection('web', false));
      });
    }
  );

  test(
    'GIVEN apps inspected, unchecking its group drops the inspection',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphList }): Promise<void> => {
      await test.step('WHEN apps is tapped and its group unchecked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphList.toggleGroup('apps (2)');
      });

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));
    }
  );

  test(
    'GIVEN apps inspected, a hidden member reads hidden and is aria-disabled while the summary stays',
    { annotation: C6 },
    async ({ graphFolderInspect, graphList }): Promise<void> => {
      await test.step('WHEN apps is tapped and docs unchecked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphList.toggleRow('docs');
      });

      await test.step('THEN docs reads hidden, web does not, and the view is unchanged', async (): Promise<void> => {
        await graphFolderInspect.expectMemberHidden('docs', true);
        await graphFolderInspect.expectMemberHidden('web', false);
        await graphFolderInspect.expectFolderView(APPS_VIEW);
      });
    }
  );

  test(
    'GIVEN a collapsed apps inspected, pressing a member expands the folder and inspects the package',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping }): Promise<void> => {
      await test.step('WHEN apps is tapped collapsed and the web member pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['apps'] }), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressMember('web');
      });

      await test.step('THEN apps is expanded and web inspected', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('apps', false);
        await graphDetails.expectInspection(packageInspection('web'));
      });
    }
  );

  test(
    'GIVEN the grouped list, the header holds Collapse and Focus as two cells of the keyboard grid',
    { annotation: C6 },
    async ({ graphFolderInspect, graphKeys }): Promise<void> => {
      await test.step('WHEN the apps group checkbox is reached by Tab', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphKeys.tabTo('apps (2)');
      });

      const walked =
        await test.step('AND ArrowRight walks Collapse, Focus, stays, and ArrowDown reaches the first row', async (): Promise<
          FocusStep[]
        > => graphKeys.walk(HEADER_WALK));

      await test.step('THEN focus landed as listed', (): void => expect(walked).toEqual(HEADER_WALK));

      await test.step('AND the apps header holds exactly the two buttons', async (): Promise<void> =>
        graphFolderInspect.expectHeaderButtons('apps', ['Collapse folder apps', 'Focus folder apps']));
    }
  );

  test(
    'GIVEN the packages folder inspected, the status counts its links and reads the same collapsed',
    { annotation: C6 },
    async ({ graphFolderInspect, graphFolders, graphPage }): Promise<void> => {
      await test.step('WHEN the packages box is tapped', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('packages');
      });

      await test.step('THEN the status reads 3 packages and 3 links in', async (): Promise<void> =>
        graphPage.expectStatus('Folder packages: 3 packages, 3 links in'));

      await test.step('WHEN both folders are collapsed and packages tapped again', async (): Promise<void> => {
        await graphFolders.toggleInList('apps', true);
        await graphFolders.toggleInList('packages', true);
        await graphFolderInspect.tapFolder('packages');
      });

      await test.step('THEN the status is unchanged', async (): Promise<void> =>
        graphPage.expectStatus('Folder packages: 3 packages, 3 links in'));
    }
  );
});
