import { test } from './graph-task.fixture.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';

const D11 = { description: 'G2-1 spec D11, D5', type: 'requirement' };

const D12 = { description: 'G2-1 spec D12', type: 'requirement' };

const SIZING = { description: 'G2-1 spec 3.2', type: 'requirement' };

test.describe('FEATURE: graph task state glyphs', () => {
  test(
    'GIVEN a cold open in task mode with app#build chosen, a running, passed and stopped app#build shows its glyph and keeps its width',
    { annotation: D11 },
    async ({ graphGlyphs, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the task state is sent', async (): Promise<void> => graphGlyphs.openChosen());

      const width = await test.step('AND the width of app#build is read', async (): Promise<number> =>
        graphGlyphs.drawnWidthOf('app#build'));

      await test.step('AND app#build is running', async (): Promise<void> => graphTaskHost.sendRuns({ 'app#build': 'running' }));

      await test.step('THEN its drawn text starts with the sync glyph', async (): Promise<void> =>
        graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.sync));

      await test.step('AND its width is unchanged', async (): Promise<void> => graphGlyphs.expectWidthOf('app#build', width));

      await test.step('WHEN app#build passed', async (): Promise<void> => graphTaskHost.sendRuns({ 'app#build': 'passed' }));

      await test.step('THEN its drawn text starts with the pass glyph', async (): Promise<void> =>
        graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.pass));

      await test.step('AND its width is unchanged', async (): Promise<void> => graphGlyphs.expectWidthOf('app#build', width));

      await test.step('WHEN app#build stopped', async (): Promise<void> => graphTaskHost.sendRuns({ 'app#build': 'stopped' }));

      await test.step('THEN its drawn text starts with the debug-stop glyph', async (): Promise<void> =>
        graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS['debug-stop']));

      await test.step('AND its width is unchanged', async (): Promise<void> => graphGlyphs.expectWidthOf('app#build', width));
    }
  );

  test(
    'GIVEN the umbrella graph open with the font and again with the font held, a plain task is wider with glyphs and the umbrella is as wide',
    { annotation: SIZING },
    async ({ graphGlyphs, secondGlyphs }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphGlyphs.open());

      await test.step('AND a second page is opened with codicon.ttf held', async (): Promise<void> =>
        secondGlyphs.open({ isCodiconHeld: true }));

      await test.step('THEN the plain task is wider with glyphs and the umbrella has the same width', async (): Promise<void> =>
        graphGlyphs.expectWidthsAgainst(secondGlyphs));
    }
  );

  test(
    'GIVEN the task graph open with the codicon font loaded, every state glyph is as wide as the blank glyph the sizer measures',
    { annotation: SIZING },
    async ({ graphGlyphs }): Promise<void> => {
      await test.step('WHEN the page is opened and the task state is sent', async (): Promise<void> => graphGlyphs.openChosen());

      await test.step('AND the codicon font has loaded', async (): Promise<void> => graphGlyphs.expectFontArrived());

      await test.step('THEN each state glyph is as wide as the blank glyph', async (): Promise<void> =>
        graphGlyphs.expectGlyphsAsWideAsBlank());
    }
  );

  test(
    'GIVEN codicon.ttf held past the font wait, the task graph draws plain labels, warns once, and keeps them when the font arrives',
    { annotation: D12 },
    async ({ graphGlyphs }): Promise<void> => {
      await test.step('WHEN the console is watched', (): void => graphGlyphs.watchConsole());

      await test.step('AND the page is opened with the font held', async (): Promise<void> =>
        graphGlyphs.open({ isCodiconHeld: true }));

      await test.step('THEN the page told the host it was ready within the font wait, before the held font came', async (): Promise<void> =>
        graphGlyphs.expectReadyWithinFontWait());

      await test.step('AND the umbrella graph draws with no codicon character in any label', async (): Promise<void> =>
        graphGlyphs.expectPlainLabels());

      await test.step('AND the page warned once about the font', (): void => graphGlyphs.expectWarnedOnce());

      await test.step('WHEN the held font arrives', async (): Promise<void> => graphGlyphs.expectFontArrived());

      await test.step('THEN the labels are still plain', async (): Promise<void> => graphGlyphs.expectPlainLabels());

      await test.step('AND the page warned once', (): void => graphGlyphs.expectWarnedOnce());

      await test.step('AND the page raised no errors', (): void => graphGlyphs.expectNoErrors());
    }
  );
});
