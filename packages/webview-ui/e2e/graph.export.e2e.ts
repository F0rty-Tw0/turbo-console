import type { PngBounds } from './common/graph.type.ts';
import { expect, test } from './graph-task.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { WIDE_TITLE_STUB } from './test/stubs/graph-export.stub.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import { EXPORT_LABEL } from '../src/graph/common/graph.const.ts';

const AC5 = { description: 'M4-6 AC5', type: 'requirement' };

const U3A_S2 = { description: 'U3a review S2', type: 'requirement' };

const EXPORT_FAILED_TEXT = 'Could not export the image';

const ANY_SIDE: PngBounds = { minWidth: 1, maxWidth: 4096, minHeight: 1, maxHeight: 4096 };

/** The 2380 px wide large graph hits the 4096 px cap on its width; its height stays under the cap. */
const WIDTH_AT_CAP: PngBounds = { minWidth: 4000, maxWidth: 4096, minHeight: 1, maxHeight: 4096 };

test.describe('FEATURE: graph export image', () => {
  test(
    'GIVEN the target-like graph, WHEN Export image is pressed, THEN one PNG is posted with each side 1 to 4096 px',
    { annotation: AC5 },
    async ({ graphExport, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeState()));

      await test.step('AND the layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN one exportImage is posted, a PNG with each side 1 to 4096 px', async (): Promise<void> =>
        graphExport.expectOnePng(ANY_SIDE));
    }
  );

  test(
    'GIVEN the large flat graph, WHEN Export image is pressed, THEN the PNG is 4000 to 4096 px wide and at most 4096 px high',
    { annotation: AC5 },
    async ({ graphExport, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

      await test.step('AND the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

      await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN one exportImage is posted, a PNG 4000 to 4096 px wide and at most 4096 px high', async (): Promise<void> =>
        graphExport.expectOnePng(WIDTH_AT_CAP));
    }
  );

  test.describe('GIVEN a device pixel ratio of 2', () => {
    test.use({ deviceScaleFactor: 2 });

    test(
      'GIVEN the large flat graph, WHEN Export image is pressed, THEN the PNG still stops at the 4096 px cap',
      { annotation: AC5 },
      async ({ graphExport, graphHost, graphPage, graphProbe }): Promise<void> => {
        await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

        await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

        await test.step('AND the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

        await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

        await test.step('THEN one exportImage is posted, a PNG 4000 to 4096 px wide and at most 4096 px high', async (): Promise<void> =>
          graphExport.expectOnePng(WIDTH_AT_CAP));
      }
    );
  });

  test(
    'GIVEN the large graph grouped into 30 boxes, WHEN Export image is pressed, THEN the PNG is at most 4096 px per side',
    { annotation: AC5 },
    async ({ graphExport, graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
        graphPage.open({ savedState: groupedSavedState(largeState().hash) }));

      await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

      await test.step('AND the grouped layout has finished', async (): Promise<void> => {
        await graphProbe.expectLayoutEngine('elk');
        await graphGrouping.expectFolderCount(30);
      });

      await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN one exportImage is posted, a PNG with each side 1 to 4096 px', async (): Promise<void> =>
        graphExport.expectOnePng(ANY_SIDE));
    }
  );

  test(
    'GIVEN the controls graph grouped into boxes, WHEN Export image is pressed, THEN the top box shows its title inside its frame',
    { annotation: AC5 },
    async ({ graphExport, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
        graphPage.open({ savedState: groupedSavedState(CONTROLS_CACHED_STUB.hash) }));

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the grouped layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN the top box title is drawn in its top padding band', async (): Promise<void> =>
        graphExport.expectTopTitleDrawn());
    }
  );

  test(
    'GIVEN a folder title wider than its box, WHEN Export image is pressed, THEN the title is cut short of the image sides',
    { annotation: AC5 },
    async ({ graphExport, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
        graphPage.open({ savedState: groupedSavedState(WIDE_TITLE_STUB.hash) }));

      await test.step('AND the wide-title graph is sent', async (): Promise<void> => graphHost.sendState(WIDE_TITLE_STUB));

      await test.step('AND the grouped layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN the title is drawn in the top padding band, clear of both image sides', async (): Promise<void> =>
        graphExport.expectTopTitleClearOfSides());
    }
  );

  test(
    'GIVEN every group unchecked, THEN Export image is disabled and posts nothing until Show all',
    { annotation: AC5 },
    async ({ graphControls, graphExport, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the root group is unchecked', async (): Promise<void> => graphList.toggleGroup('(root) (1)'));

      await test.step('AND the apps group is unchecked', async (): Promise<void> => graphList.toggleGroup('apps (2)'));

      await test.step('AND the packages group is unchecked', async (): Promise<void> => graphList.toggleGroup('packages (5)'));

      await test.step('THEN the count reads 0 of 8', async (): Promise<void> => graphControls.expectCount(0, 8));

      await test.step('AND Export image is disabled', async (): Promise<void> => graphPage.expectDisabled(EXPORT_LABEL));

      await test.step('WHEN the disabled Export image is clicked', async (): Promise<void> => graphExport.pressDisabled());

      await test.step('THEN no exportImage was posted', async (): Promise<void> => graphExport.expectNonePosted());

      await test.step('WHEN Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN Export image is enabled', async (): Promise<void> => graphPage.expectEnabled(EXPORT_LABEL));

      await test.step('WHEN Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN one exportImage is posted, a PNG with each side 1 to 4096 px', async (): Promise<void> =>
        graphExport.expectOnePng(ANY_SIDE));
    }
  );

  test(
    'GIVEN the target-like graph and failing canvas reads, WHEN Export image is pressed, THEN the notice line says so and the status line does not',
    { annotation: U3A_S2 },
    async ({ graphExport, graphHost, graphPage, graphProbe, graphTask }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeState()));

      await test.step('AND the layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND canvas reads fail', async (): Promise<void> => graphExport.breakCanvasReads());

      await test.step('AND Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN the notice line shows the export failed', async (): Promise<void> =>
        graphTask.expectNotice(EXPORT_FAILED_TEXT));

      await test.step('AND the status line does not say it', async (): Promise<void> =>
        expect(graphPage.status).not.toHaveText(EXPORT_FAILED_TEXT));

      await test.step('AND nothing was posted', async (): Promise<void> => graphExport.expectNonePosted());
    }
  );
});
