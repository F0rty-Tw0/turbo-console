import type { PlainEdgeState } from './common/graph-folder-links.type.ts';
import { test as base } from './graph.fixture.ts';
import { GraphPlainEdges } from './pages/graph-plain-edges.po.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { linkInspection } from './test/utils/graph-inspection.spec.util.ts';
import { rgbOfHex } from './test/utils/graph-title-chip.spec.util.ts';
import { GROUPED_SAVED, LIBS_UI } from './test/utils/graph-u0-routes.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

type PlainEdgesFixtures = {
  readonly graphPlainEdges: GraphPlainEdges;
};

const test = base.extend<PlainEdgesFixtures>({
  graphPlainEdges: async ({ page }, use): Promise<void> => {
    await use(new GraphPlainEdges(page));
  }
});

const U0 = U0_STATE_STUB;

/** A package edge inside the `libs` box (and its `libs/data` box), drawn whether `libs/ui` is collapsed or not. */
const INNER = { source: '@company/data-queue', target: '@company/data-cache' } as const;

/** A package edge whose two ends sit in the `packages` box, so its midpoint lies over that box. */
const OVER_BOX = { source: '@company/api-client', target: '@company/utils' } as const;

/** The dark theme's folder box fill (the editor background) and edge colour (the description foreground). */
const BOX_FILL = rgbOfHex(THEME_DARK_STUB.vars['--vscode-editor-background'] ?? '');

const EDGE_INK = rgbOfHex(THEME_DARK_STUB.vars['--vscode-descriptionForeground'] ?? '');

const STATES: PlainEdgeState[] = [
  { name: 'every folder expanded', collapsed: [], shown: 'none' },
  { name: 'libs/ui alone collapsed', collapsed: [LIBS_UI], shown: 'some' }
];

test.describe('FEATURE: every edge draws as a plain bezier over the folder boxes and under the cards', () => {
  for (const { name, collapsed, shown } of STATES)
    test(`GIVEN the U0 workspace grouped in the dark theme with ${name} THEN every package edge and folder link is a bezier at card depth, and a line inside the libs box shows over its fill`, async ({
      graphFolders,
      graphHost,
      graphLook,
      graphPage,
      graphPlainEdges,
      graphProbe
    }): Promise<void> => {
      await test.step('WHEN the page is opened grouped in the dark theme and the U0 state is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: GROUPED_SAVED });
        await graphLook.applyTheme(THEME_DARK_STUB);
        await graphHost.sendState(U0);
      });

      await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step(`AND ${name}`, async (): Promise<void> => {
        for (const folder of collapsed) await graphFolders.toggleInList(folder, true);
      });

      await test.step('THEN every drawn package edge and folder link is a bezier at card depth', async (): Promise<void> =>
        graphPlainEdges.expectEveryLinePlain(shown));

      await test.step('AND the data-queue to data-cache line shows over the libs box fill', async (): Promise<void> =>
        graphPlainEdges.expectInkOnEdge(INNER, BOX_FILL, EDGE_INK, name));
    });

  test('GIVEN the U0 workspace grouped with every folder expanded THEN some package edge crosses a folder box that holds neither of its ends', async ({
    graphHost,
    graphPage,
    graphPlainEdges,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('THEN some drawn line passes through a foreign folder box, not around it', async (): Promise<void> =>
      graphPlainEdges.expectSomeLineThroughForeignBoxes());
  });

  test('GIVEN the U0 workspace grouped and framed WHEN a package edge is clicked at its midpoint over its folder box THEN the link is inspected, not the box', async ({
    graphCanvas,
    graphDetails,
    graphHost,
    graphPage,
    graphPlainEdges,
    graphProbe,
    page
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and ELK has laid it out', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphProbe.expectLayoutEngine('elk');
    });

    await test.step('AND Fit frames the graph', async (): Promise<void> => {
      await graphPage.pressButton(FIT_LABEL);
      await graphCanvas.expectAllNodesInView();
    });

    await test.step('AND the api-client to utils line is clicked at its midpoint, over the packages box', async (): Promise<void> => {
      const midpoint = await graphPlainEdges.midpointOf(OVER_BOX.source, OVER_BOX.target);

      await page.mouse.click(midpoint.x, midpoint.y);
    });

    await test.step('THEN the link is inspected', async (): Promise<void> =>
      graphDetails.expectInspection(linkInspection(OVER_BOX.source, OVER_BOX.target)));
  });
});
