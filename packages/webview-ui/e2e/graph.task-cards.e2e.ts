import type { RunOutline } from './common/graph.type.ts';
import { test } from './graph-task.fixture.ts';
import { GraphTaskCards } from './pages/graph-task-cards.po.ts';
import type { GraphRunState } from '../src/bridge/common/graph-state.type.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';

const SIZE = { description: 'G2-5a spec F1, AC1', type: 'requirement' };

const LABEL = { description: 'G2-5a spec F2, AC2', type: 'requirement' };

const MEASURE = { description: 'G2-5a spec F1, C1', type: 'requirement' };

/** The spec numbers written out, so a changed constant cannot move the oracle with it. */
const CARD = { width: 180, height: 60 };

/** A run state and the 2 px outline the default (light) theme stub draws for it: seeing it is how a test knows the state was applied. */
type RunCase = {
  readonly state: GraphRunState;
  readonly outline: RunOutline;
};

const outlineOf = (colour: string): RunOutline => {
  const outline: RunOutline = { width: 2, colour };

  return outline;
};

/** Neighbours differ in colour, so each outline proves its own state landed and not the one before. */
const RUN_CASES: RunCase[] = [
  { state: 'running', outline: outlineOf('rgb(191,136,3)') },
  { state: 'continuous', outline: outlineOf('rgb(56,138,52)') },
  { state: 'failed', outline: outlineOf('rgb(241,76,76)') },
  { state: 'passed', outline: outlineOf('rgb(56,138,52)') },
  { state: 'stopped', outline: outlineOf('rgb(113,113,113)') },
  { state: 'failed-to-start', outline: outlineOf('rgb(248,81,73)') }
];

/** The drawn text of `app#build` per run state: row 1 the glyph and ` build`, row 2 the word; written out, not derived from the code under test. */
const TEXT_BY_STATE: Record<GraphRunState, string> = {
  running: `${GLYPH_CODE_POINTS.sync} build\nRunning`,
  continuous: `${GLYPH_CODE_POINTS.pulse} build\nContinuous`,
  passed: `${GLYPH_CODE_POINTS.pass} build\nPassed`,
  failed: `${GLYPH_CODE_POINTS.error} build\nFailed`,
  stopped: `${GLYPH_CODE_POINTS['debug-stop']} build\nStopped`,
  'failed-to-start': `${GLYPH_CODE_POINTS.error} build\nFailed to start`
};

const IDLE_TEXT = `${GLYPH_CODE_POINTS.blank} build\nNot run`;

test.describe('FEATURE: graph task status cards', () => {
  test(
    'GIVEN app#build open, it is a 180 x 60 card idle, in each run state, selected and deselected',
    { annotation: SIZE },
    async ({ graphGlyphs, graphTaskHost, graphTaskProbe, graphProbe, graphCanvas, page }): Promise<void> => {
      const cards = new GraphTaskCards(page);

      await test.step('WHEN the page is opened', async (): Promise<void> => graphGlyphs.openChosen());

      await test.step('THEN app#build is 180 x 60 idle', async (): Promise<void> => cards.expectCardSize('app#build', CARD));

      for (const { state, outline } of RUN_CASES) {
        await test.step(`WHEN app#build is ${state} THEN it is 180 x 60`, async (): Promise<void> => {
          await graphTaskHost.sendRuns({ 'app#build': state });
          await graphTaskProbe.expectRunOutline('app#build', outline);
          await cards.expectCardSize('app#build', CARD);
        });
      }

      await test.step('WHEN app#build is tapped THEN it is 180 x 60', async (): Promise<void> => {
        await graphCanvas.tapNode('app#build');
        await graphProbe.expectSelected('app#build');
        await cards.expectCardSize('app#build', CARD);
      });

      await test.step('WHEN the background is tapped THEN it is 180 x 60', async (): Promise<void> => {
        await graphCanvas.tapBackground();
        await graphProbe.expectSelected(null);
        await cards.expectCardSize('app#build', CARD);
      });
    }
  );

  test(
    'GIVEN app#build open, its label is the glyph and name over the run state word, and idle again after the runs clear',
    { annotation: LABEL },
    async ({ graphGlyphs, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphGlyphs.openChosen());

      await test.step('THEN app#build reads the blank glyph, build and Not run', async (): Promise<void> =>
        graphTaskProbe.expectText('app#build', IDLE_TEXT));

      for (const { state } of RUN_CASES) {
        await test.step(`WHEN app#build is ${state} THEN its label shows that state`, async (): Promise<void> => {
          await graphTaskHost.sendRuns({ 'app#build': state });
          await graphTaskProbe.expectText('app#build', TEXT_BY_STATE[state]);
        });
      }

      await test.step('WHEN the runs clear THEN the label is idle again', async (): Promise<void> => {
        await graphTaskHost.sendRuns({});
        await graphTaskProbe.expectText('app#build', IDLE_TEXT);
      });
    }
  );

  test(
    'GIVEN codicon.ttf held, hub#build is a 180 x 60 card whose label is the bare name over Not run',
    { annotation: LABEL },
    async ({ graphGlyphs, graphTaskProbe, page }): Promise<void> => {
      const cards = new GraphTaskCards(page);

      await test.step('WHEN the page is opened with the font held', async (): Promise<void> =>
        graphGlyphs.open({ isCodiconHeld: true, waitUntil: 'domcontentloaded' }));

      await test.step('AND the codicon font has not arrived', async (): Promise<void> => cards.expectCodiconHeld());

      await test.step('THEN hub#build reads build over Not run', async (): Promise<void> =>
        graphTaskProbe.expectText('hub#build', 'build\nNot run'));

      await test.step('AND it is 180 x 60', async (): Promise<void> => cards.expectCardSize('hub#build', CARD));
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
        cards.openLong({ isCodiconHeld: true, waitUntil: 'domcontentloaded' }));

      await test.step('AND the codicon font has not arrived', async (): Promise<void> => cards.expectCodiconHeld());

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
