import { OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import type { GraphOptions } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { threeFoldersState } from './test/utils/graph-boards.spec.util.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { packageInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { Position } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const C6 = { description: 'M4-4 C6', type: 'requirement' };

const FOCUS_5 = { description: 'M4-4 Review Focus 5', type: 'requirement' };

const REACH = { description: 'M4-4 §4.6', type: 'requirement' };

const BOARDS = placedBoardsState();

const THREE = threeFoldersState();

const UI = '@acme/ui';

const UT = '@acme/utils';

/** Puts the apps box at the right of the canvas, under where the overlay opens at 959 px. */
const UNDER_OVERLAY_PAN: Position = { x: 300, y: 100 };

const HELD: GraphOptions = { workers: 'held' };

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder inspection reaching collapsed folders and the overlay', () => {
  test(
    'GIVEN a trace whose middle package is hidden inside a collapsed folder, the folder opens for the ghost',
    { annotation: FOCUS_5 },
    async ({ graphDetails, graphFolderInspect, graphFolders, graphGrouping, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN packages is collapsed and web traced to utils through the panel', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['packages'] }), BOARDS);
        await graphList.pick('web');
        await graphDetails.startTrace();
        await graphTrace.pickCandidate(UT);
      });

      await test.step('AND ui is unchecked in the list', async (): Promise<void> => graphList.toggleRow(UI));

      await test.step('THEN the trace stays, packages is expanded and visible, and ui is the ghost', async (): Promise<void> => {
        await graphDetails.expectInspection(traceInspection('web', UT));
        await graphGrouping.expectFolderCollapsed('packages', false);
        await graphTrace.expectGhost(UI);
        await graphFolders.expectFolderVisible('packages', true);
      });

      await test.step('AND the status counts the hidden package', async (): Promise<void> =>
        graphPage.expectStatus('Trace web → @acme/utils: 3 packages, 1 hidden'));
    }
  );

  test(
    'GIVEN a ghost alone in a collapsed middle folder, the trace expands that folder',
    { annotation: FOCUS_5 },
    async ({ graphDetails, graphFolderInspect, graphFolders, graphGrouping, graphList, graphTrace }): Promise<void> => {
      await test.step('WHEN f2 is collapsed, b unchecked and a traced to c', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['f2'] }), THREE);
        await graphList.toggleRow('b');
        await graphList.pick('a');
        await graphDetails.startTrace();
        await graphList.pick('c');
      });

      await test.step('THEN the trace stays and f2 is expanded and drawn for the ghost b', async (): Promise<void> => {
        await graphDetails.expectInspection(traceInspection('a', 'c'));
        await graphGrouping.expectFolderCollapsed('f2', false);
        await graphTrace.expectGhost('b');
        await graphFolders.expectFolderVisible('f2', true);
      });

      await test.step('AND b is not among the visible packages', async (): Promise<void> =>
        graphGrouping.expectVisibleIds(['a', 'c', 'd']));
    }
  );

  test(
    'GIVEN a narrow editor and apps under the details overlay, tapping apps pans its box clear of the overlay',
    { annotation: C6 },
    async ({ graphFolderInspect, graphNarrow }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the boards open with apps beside the overlay', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(grouped({ pan: UNDER_OVERLAY_PAN }), BOARDS);
      });

      await test.step('AND the apps box is tapped', async (): Promise<void> => graphFolderInspect.tapFolder('apps'));

      await test.step('THEN the apps box ends left of the overlay with the margin to spare', async (): Promise<void> =>
        graphFolderInspect.expectFolderClear('apps'));
    }
  );

  test(
    'GIVEN a switch to flat still laying out, tapping a box inspects nothing',
    { annotation: C6 },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphPage }): Promise<void> => {
      await test.step('WHEN the boards open grouped with the flat layout held and Group by folder is unchecked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS, HELD);
        await graphGrouping.setGrouped(false);
      });

      await test.step('AND the boxes are still drawn and the apps box is tapped', async (): Promise<void> => {
        await graphGrouping.expectFolderCount(2);
        await graphFolderInspect.tapFolder('apps');
        await graphPage.waitFrames();
      });

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));
    }
  );

  test(
    'GIVEN a package picked while flat inside a folder saved collapsed, grouping again expands that folder',
    { annotation: REACH },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphList }): Promise<void> => {
      await test.step('WHEN packages is saved collapsed, the view goes flat and ui is picked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['packages'] }), BOARDS);
        await graphGrouping.setGrouped(false);
        await graphGrouping.expectFolderCount(0);
        await graphList.pick(UI);
      });

      await test.step('AND Group by folder is checked again', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN ui stays inspected and packages is expanded', async (): Promise<void> => {
        await graphGrouping.expectFolderCount(2);
        await graphDetails.expectInspection(packageInspection(UI));
        await graphGrouping.expectFolderCollapsed('packages', false);
      });
    }
  );

  test(
    'GIVEN a trace made while flat through a ghost in a folder saved collapsed, grouping again expands it for the ghost',
    { annotation: REACH },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphList, graphTrace }): Promise<void> => {
      await test.step('WHEN f2 is saved collapsed, the view goes flat, b is unchecked and a traced to c', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ collapsed: ['f2'] }), THREE);
        await graphGrouping.setGrouped(false);
        await graphGrouping.expectFolderCount(0);
        await graphList.toggleRow('b');
        await graphList.pick('a');
        await graphDetails.startTrace();
        await graphList.pick('c');
        await graphTrace.expectGhost('b');
      });

      await test.step('AND Group by folder is checked again', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN the trace stays and f2 is expanded for the ghost b', async (): Promise<void> => {
        await graphGrouping.expectFolderCount(3);
        await graphDetails.expectInspection(traceInspection('a', 'c'));
        await graphGrouping.expectFolderCollapsed('f2', false);
      });
    }
  );
});
