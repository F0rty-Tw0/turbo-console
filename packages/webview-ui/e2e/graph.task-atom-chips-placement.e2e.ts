import { test } from './graph-atom-chips.fixture.ts';
import { TARGET_LIKE_UMBRELLA } from './test/utils/graph-target-like-tasks.spec.util.ts';
import type { ProbeRect } from '../src/graph/common/graph-probe-titles.type.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const AC3 = { description: 'G2-3b AC3', type: 'requirement' };

const AC4 = { description: 'G2-3b AC4', type: 'requirement' };

const ZOOMED_OUT = 0.5;

const ZOOMED_IN = 2;

test.describe('FEATURE: graph task umbrella chip row placement', () => {
  test(
    'GIVEN the umbrella with chips, the row stays inside the umbrella after a pan',
    { annotation: AC3 },
    async ({ openUmbrella, graphPage, graphCanvas, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('AND the graph is fit', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('THEN the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));

      const before = await test.step('AND the row is read', async (): Promise<ProbeRect> =>
        graphAtomChips.rectOf(TARGET_LIKE_UMBRELLA));

      await test.step('WHEN the canvas is panned by (120, 60)', async (): Promise<void> => graphCanvas.panBy(120, 60));

      await test.step('THEN the row follows and lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectFollowsAfter(TARGET_LIKE_UMBRELLA, before));
    }
  );

  test(
    'GIVEN the camera zoomed out to <= 0.5 and in to >= 2, the row stays inside the umbrella each time',
    { annotation: AC3 },
    async ({ openUmbrella, graphPage, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('AND the graph is fit', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('AND the umbrella is panned to the canvas centre', async (): Promise<void> =>
        graphAtomChips.centreUmbrella(TARGET_LIKE_UMBRELLA));

      await test.step('AND the camera is zoomed out to 0.5 or less', async (): Promise<void> => graphAtomChips.zoomOutTo(ZOOMED_OUT));

      await test.step('THEN the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));

      await test.step('WHEN the camera is zoomed in to 2 or more', async (): Promise<void> => graphAtomChips.zoomInTo(ZOOMED_IN));

      await test.step('THEN the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));
    }
  );

  test(
    'GIVEN the umbrella dragged by (80, 40), the row follows on the next render',
    { annotation: AC3 },
    async ({ openUmbrella, graphPage, graphCanvas, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('AND the graph is fit', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('AND the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));

      const before = await test.step('AND the row is read', async (): Promise<ProbeRect> =>
        graphAtomChips.rectOf(TARGET_LIKE_UMBRELLA));

      await test.step('WHEN the umbrella is dragged by (80, 40)', async (): Promise<void> =>
        graphCanvas.dragNode(TARGET_LIKE_UMBRELLA, 80, 40));

      await test.step('THEN the row follows and lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectFollowsAfter(TARGET_LIKE_UMBRELLA, before));
    }
  );

  test(
    'GIVEN the umbrella expanded, the row sits inside the (moved) umbrella; collapsed again it still does',
    { annotation: AC3 },
    async ({ openUmbrella, graphPage, graphAtoms, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('AND the graph is fit', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the box is drawn', async (): Promise<void> => graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, true));

      await test.step('AND the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));

      await test.step('WHEN the umbrella is double tapped again', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the box is gone', async (): Promise<void> => graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, false));

      await test.step('AND the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));
    }
  );

  test(
    'GIVEN a tap on the row centre, the umbrella is selected',
    { annotation: AC4 },
    async ({ openUmbrella, graphPage, graphProbe, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('AND the graph is fit', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('AND the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));

      await test.step('WHEN the row centre is tapped', async (): Promise<void> => graphAtomChips.tapRowCentre(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the umbrella is selected', async (): Promise<void> => graphProbe.expectSelected(TARGET_LIKE_UMBRELLA));
    }
  );

  test(
    'GIVEN a double tap on the row centre, the group expands; a second double tap collapses it',
    { annotation: AC4 },
    async ({ openUmbrella, graphPage, graphAtoms, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('AND the graph is fit', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('AND the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));

      await test.step('WHEN the row centre is double tapped', async (): Promise<void> =>
        graphAtomChips.doubleTapRowCentre(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the box is drawn', async (): Promise<void> => graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, true));

      await test.step('AND the row lies inside the umbrella', async (): Promise<void> =>
        graphAtomChips.expectInsideUmbrella(TARGET_LIKE_UMBRELLA));

      await test.step('WHEN the row centre is double tapped again', async (): Promise<void> =>
        graphAtomChips.doubleTapRowCentre(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the box is gone', async (): Promise<void> => graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, false));
    }
  );
});
