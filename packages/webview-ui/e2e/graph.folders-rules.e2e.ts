import type { FolderLinkFacts } from './common/graph-folders.type.ts';
import { test } from './graph-task.fixture.ts';
import { collapsedSavedState, ghostFolderState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { bundleInspection } from './test/utils/graph-inspection.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';
import { collapsedIdOf } from '../src/graph/utils/folder-id.util.ts';

const C6 = { description: 'M4-4 C6', type: 'requirement' };

const BOARDS = placedBoardsState();

const APPS_LINKS: FolderLinkFacts[] = [
  { source: 'apps', target: '@acme/ui', count: 2 },
  { source: 'apps', target: '@acme/utils', count: 1 }
];

const GHOSTS = ghostFolderState();

const TRACE_THROUGH_MID = { start: 'a', end: 'b' };

test.describe('FEATURE: folder rules', () => {
  test('GIVEN a trace through a folder whose middle package is unticked, that folder counts as shown', async ({
    graphFolders,
    graphHost,
    graphPage,
    graphTrace
  }): Promise<void> => {
    const opened = groupedSavedState(GHOSTS.hash);
    const saved = { ...opened, hidden: ['m'], trace: TRACE_THROUGH_MID };

    await test.step('WHEN the page opens grouped with m unticked and a trace from a to b', async (): Promise<void> =>
      graphPage.open({ savedState: saved }));

    await test.step('AND the state is sent', async (): Promise<void> => graphHost.sendState(GHOSTS));

    await test.step('THEN the mid folder is shown', async (): Promise<void> => graphFolders.expectFolderVisible('mid', true));

    await test.step('AND m is drawn as a ghost', async (): Promise<void> => graphTrace.expectGhost('m'));
  });

  test('GIVEN a folder whose only package is unticked and no trace, that folder is not shown', async ({
    graphFolders,
    graphHost,
    graphPage
  }): Promise<void> => {
    const opened = groupedSavedState(GHOSTS.hash);
    const saved = { ...opened, hidden: ['m'] };

    await test.step('WHEN the page opens grouped with m unticked', async (): Promise<void> => graphPage.open({ savedState: saved }));

    await test.step('AND the state is sent', async (): Promise<void> => graphHost.sendState(GHOSTS));

    await test.step('THEN the mid folder is not shown', async (): Promise<void> => graphFolders.expectFolderVisible('mid', false));

    await test.step('AND the other folders are', async (): Promise<void> => {
      await graphFolders.expectFolderVisible('x', true);
      await graphFolders.expectFolderVisible('y', true);
    });
  });

  test('GIVEN apps collapsed, unticking its group hides the folder and its links, and ticking it brings them back', async ({
    graphFolders,
    graphHost,
    graphList,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with apps collapsed', async (): Promise<void> =>
      graphPage.open({ savedState: collapsedSavedState(BOARDS.hash, ['apps']) }));

    await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

    await test.step('THEN apps is shown with two folder links', async (): Promise<void> => {
      await graphFolders.expectFolderVisible('apps', true);
      await graphFolders.expectFolderLinks(APPS_LINKS);
    });

    await test.step('WHEN the apps group is unticked', async (): Promise<void> => graphList.toggleGroup('apps (2)'));

    await test.step('THEN apps is not shown and has no folder links', async (): Promise<void> => {
      await graphFolders.expectFolderVisible('apps', false);
      await graphFolders.expectFolderLinks([]);
    });

    await test.step('WHEN the apps group is ticked again', async (): Promise<void> => graphList.toggleGroup('apps (2)'));

    await test.step('THEN apps and its two folder links are back', async (): Promise<void> => {
      await graphFolders.expectFolderVisible('apps', true);
      await graphFolders.expectFolderLinks(APPS_LINKS);
    });
  });

  test(
    'GIVEN apps collapsed and ui unticked, apps links to utils only',
    { annotation: C6 },
    async ({ graphFolders, graphHost, graphPage }): Promise<void> => {
      const opened = collapsedSavedState(BOARDS.hash, ['apps']);
      const saved = { ...opened, hidden: ['@acme/ui'] };

      await test.step('WHEN the boards open grouped with apps collapsed and ui unticked', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

      await test.step('THEN the only folder link goes from apps to utils', async (): Promise<void> =>
        graphFolders.expectFolderLinks([{ source: 'apps', target: '@acme/utils', count: 1 }]));
    }
  );

  test(
    'GIVEN a folder link crossing a box, tapping it over the box inspects the bundle, not the box',
    { annotation: C6 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphProbe, graphWidgetInput }): Promise<void> => {
      const opened = collapsedSavedState(BOARDS.hash, ['apps']);
      const saved = { ...opened, selected: '@acme/config' };

      await test.step('WHEN the boards open grouped with apps collapsed and config selected', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

      await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> => {
        await graphPage.pressButton(FIT_LABEL);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('THEN config is selected', async (): Promise<void> => graphProbe.expectSelected('@acme/config'));

      await test.step('WHEN the apps to utils link is tapped over the packages box, just below the packages header row', async (): Promise<void> =>
        graphWidgetInput.tapLinkBelowRow('apps', '@acme/utils', 'packages'));

      await test.step('THEN nothing is selected, the bundle is inspected and the status line counts its link', async (): Promise<void> => {
        await graphProbe.expectSelected(null);
        await graphDetails.expectInspection(bundleInspection(collapsedIdOf('apps'), '@acme/utils'));
        await graphPage.expectStatus('1 link: apps → @acme/utils');
      });
    }
  );
});
