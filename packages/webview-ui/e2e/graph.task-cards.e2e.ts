import { test } from './graph-task.fixture.ts';
import { GraphTaskCards } from './pages/graph-task-cards.po.ts';
import type { GraphRunState } from '../src/bridge/common/graph-state.type.ts';

const SIZE = { description: 'G2-5a spec F1, AC1', type: 'requirement' };

const MEASURE = { description: 'G2-5a spec F1, C1', type: 'requirement' };

/** The spec numbers written out, so a changed constant cannot move the oracle with it. */
const CARD = { width: 180, height: 60 };

const RUN_STATES: GraphRunState[] = ['running', 'continuous', 'passed', 'failed', 'stopped', 'failed-to-start'];

test.describe('FEATURE: graph task status cards', () => {
  test(
    'GIVEN app#build open, it is a 180 x 60 card idle, in each run state, selected and deselected',
    { annotation: SIZE },
    async ({ graphGlyphs, graphTaskHost, graphCanvas, page }): Promise<void> => {
      const cards = new GraphTaskCards(page);

      await test.step('WHEN the page is opened', async (): Promise<void> => graphGlyphs.openChosen());

      await test.step('THEN app#build is 180 x 60 idle', async (): Promise<void> => cards.expectCardSize('app#build', CARD));

      for (const state of RUN_STATES) {
        await test.step(`WHEN app#build is ${state} THEN it is 180 x 60`, async (): Promise<void> => {
          await graphTaskHost.sendRuns({ 'app#build': state });
          await cards.expectCardSize('app#build', CARD);
        });
      }

      await test.step('WHEN app#build is tapped THEN it is 180 x 60', async (): Promise<void> => {
        await graphCanvas.tapNode('app#build');
        await cards.expectCardSize('app#build', CARD);
      });

      await test.step('WHEN the background is tapped THEN it is 180 x 60', async (): Promise<void> => {
        await graphCanvas.tapBackground();
        await cards.expectCardSize('app#build', CARD);
      });
    }
  );

  test(
    'GIVEN a task named wider than the minimum card, the card is as wide as its bold row 1 with the font loaded',
    { annotation: MEASURE },
    async ({ page }): Promise<void> => {
      const cards = new GraphTaskCards(page);

      await test.step('WHEN the page is opened with the long-named task', async (): Promise<void> => cards.openLong());

      await test.step('THEN the card is wider than 180 px and as wide as the bold glyph slot, space and name plus the padding', async (): Promise<void> =>
        cards.expectLongCardFitsBoldRow(true));
    }
  );

  test(
    'GIVEN a task named wider than the minimum card and codicon.ttf held, the card is as wide as its bold name and keeps that width when the font arrives',
    { annotation: MEASURE },
    async ({ graphGlyphs, page }): Promise<void> => {
      const cards = new GraphTaskCards(page);

      await test.step('WHEN the page is opened with the font held', async (): Promise<void> =>
        cards.openLong({ isCodiconHeld: true }));

      const width =
        await test.step('THEN the card is wider than 180 px and as wide as the bold name plus the padding', async (): Promise<number> => {
          await cards.expectLongCardFitsBoldRow(false);

          return cards.widthOfLong();
        });

      await test.step('WHEN the held font arrives', async (): Promise<void> => graphGlyphs.expectFontArrived());

      await test.step('THEN the card keeps its width', async (): Promise<void> => cards.expectLongWidth(width));
    }
  );

  test(
    'GIVEN the task graph open with the codicon font loaded, every state glyph is as wide as the blank glyph at bold weight too',
    { annotation: MEASURE },
    async ({ page }): Promise<void> => {
      const cards = new GraphTaskCards(page);

      await test.step('WHEN the page is opened', async (): Promise<void> => cards.openLong());

      await test.step('THEN each bold state glyph is as wide as the bold blank glyph', async (): Promise<void> =>
        cards.expectBoldGlyphsAsWideAsBlank());
    }
  );
});
