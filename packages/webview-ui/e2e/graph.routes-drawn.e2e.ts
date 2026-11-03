import { expect } from '@playwright/test';

import { test } from './graph-routes.fixture.ts';
import { U0_EDGES_STUB, U0_LIBS_UI_STUB, U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphEdge } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { edgeIdOf } from '../src/graph/utils/edge-id.util.ts';
import { freshViewStateOf } from '../src/graph/utils/fresh-view-state.util.ts';

type ModeRow = {
  readonly name: string;
  readonly saved: GraphViewState;
};

const U0 = U0_STATE_STUB;

const UI = '@company/ui';

const LIBS_UI = 'libs/ui';

const UI_ONLY: string[] = [UI];

const ALL_EDGE_IDS: string[] = U0_EDGES_STUB.map(edgeIdOf);

/** The ids of the U0 edges with an end in one of `names`, read from the stub's edge list, not from the page. */
const edgeIdsWithAnEndIn = (names: string[]): string[] => {
  const hasEndIn = (edge: GraphEdge): boolean => names.includes(edge.source) || names.includes(edge.target);

  return U0_EDGES_STUB.filter(hasEndIn).map(edgeIdOf);
};

/** `@company/ui` links to ui-button, ui-forms, ui-theme and from admin, docs, web: 6 edges. */
const UI_EDGE_IDS: string[] = edgeIdsWithAnEndIn(UI_ONLY);

const LIBS_UI_EDGE_IDS: string[] = edgeIdsWithAnEndIn(U0_LIBS_UI_STUB);

const REST_EDGE_IDS: string[] = ALL_EDGE_IDS.filter((id): boolean => !UI_EDGE_IDS.includes(id));

const FRESH: GraphViewState = freshViewStateOf(U0.hash);

const FLAT_SAVED: GraphViewState = { ...FRESH, grouped: false };

const GROUPED_SAVED: GraphViewState = groupedSavedState(U0.hash);

const MODES: ModeRow[] = [
  { name: 'flat', saved: FLAT_SAVED },
  { name: 'grouped', saved: GROUPED_SAVED }
];

for (const { name, saved } of MODES) {
  test.describe(`FEATURE: U0 edges drawn on their routes, ${name}`, () => {
    test(`GIVEN the U0 workspace laid out ${name}, every line is drawn on its route clear of the nodes (b2, b3)`, async ({
      graphHost,
      graphPage,
      graphProbe,
      graphRoutes
    }): Promise<void> => {
      await test.step(`WHEN the page is opened ${name} and the U0 state is sent`, async (): Promise<void> => {
        await graphPage.open({ savedState: saved });
        await graphHost.sendState(U0);
      });

      await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('THEN all 28 lines are routed with at least 3 points (b2)', async (): Promise<void> =>
        graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length));

      await test.step('AND no line passes through a node that is not one of its ends, 2 px inside it (b2)', async (): Promise<void> => {
        await expect.poll(async (): Promise<number> => graphRoutes.throughNodeCount()).toBe(0);
      });

      await test.step('AND no line has its midpoint inside a node box (b3)', async (): Promise<void> => {
        await expect.poll(async (): Promise<number> => graphRoutes.midpointsUnderCount()).toBe(0);
      });
    });
  });
}

test.describe('FEATURE: a drag straightens only the edges it moved', () => {
  test('GIVEN the U0 workspace laid out flat, dragging @company/ui straightens its 6 edges, and the posted cache keeps that (b5)', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: FLAT_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
    });

    await test.step('AND @company/ui is dragged by 40 px right and 30 px down', async (): Promise<void> =>
      graphCanvas.dragNode(UI, 40, 30));

    await test.step('THEN its 6 edges are straight and the other 22 routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept(UI_EDGE_IDS));

    await test.step('AND the posted routes lack those 6', async (): Promise<void> => graphRoutes.expectPostedRouteIds(REST_EDGE_IDS));

    await test.step('WHEN the page is reopened with that post cached', async (): Promise<void> => {
      await graphRoutes.reopenWithPostedFlatCached(U0);
      await graphProbe.expectLayoutEngine('cache');
    });

    await test.step('THEN the same 6 edges are straight and the other 22 routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept(UI_EDGE_IDS));
  });

  test('GIVEN the U0 workspace laid out grouped, dragging the libs/ui box straightens every edge with an end in its 4 packages (b5)', async ({
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
    });

    await test.step('AND the libs/ui box is dragged by 60 px right and 40 px down', async (): Promise<void> =>
      graphGrouping.dragBox(LIBS_UI, 60, 40));

    await test.step('THEN every edge with an end in libs/ui is straight and the rest routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept(LIBS_UI_EDGE_IDS));
  });
});

test.describe('FEATURE: folder toggles keep the routes', () => {
  test('GIVEN the U0 workspace laid out grouped, collapsing and expanding libs/ui leaves the 28 lines routed', async ({
    graphFolders,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
    });

    await test.step('AND libs/ui is collapsed and expanded in the list', async (): Promise<void> => {
      await graphFolders.toggleInList(LIBS_UI, true);
      await graphFolders.expectListToggle(LIBS_UI, false);
      await graphFolders.toggleInList(LIBS_UI, false);
      await graphFolders.expectListToggle(LIBS_UI, true);
    });

    await test.step('THEN the 28 lines are routed again', async (): Promise<void> =>
      graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length));
  });
});
