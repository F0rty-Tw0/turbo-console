import { test } from './graph-task-prediction.fixture.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';

const SPEC_7 = { description: 'M3-1 spec 7.7, 4 (Feeds: graph)', type: 'requirement' };
const BLANK = GLYPH_CODE_POINTS.blank;
const HISTORY = GLYPH_CODE_POINTS.history;
const QUESTION = GLYPH_CODE_POINTS.question;
const TASK_IDS = ['app#build', 'lib#build', 'ui#build'];
const PACKAGES = ['app', 'lib', 'ui'];
const PREDICTIONS = { 'app#build': 'cached', 'lib#build': 'unknown', 'ui#build': 'notCached' } as const;
const TICKED = { type: 'setViewToggle', toggle: 'prediction', shown: true } as const;

test.describe('FEATURE: graph cache prediction', () => {
  test(
    'GIVEN task mode over app, lib and ui with the toggle on, cached draws history, unknown draws question, not cached draws the blank, and a runs message without predictions clears all three',
    { annotation: SPEC_7 },
    async ({ graphPrediction, graphTaskHost, graphGlyphs }): Promise<void> => {
      await test.step('WHEN the page is opened with predictionShown true', async () => graphPrediction.open(true));

      await test.step('THEN the three tasks start blank', async () => {
        for (const id of TASK_IDS) await graphGlyphs.expectFirstChar(id, BLANK);
      });

      await test.step('WHEN the host sends runs with the three predictions', async () => graphTaskHost.sendRuns({}, PREDICTIONS));

      await test.step('THEN app#build draws history, lib#build question and ui#build the blank', async () => {
        await graphGlyphs.expectFirstChar('app#build', HISTORY);
        await graphGlyphs.expectFirstChar('lib#build', QUESTION);
        await graphGlyphs.expectFirstChar('ui#build', BLANK);
      });

      await test.step('WHEN the host sends one runs message without predictions', async () => graphTaskHost.sendRuns({}));

      await test.step('THEN all three are blank again', async () => {
        for (const id of TASK_IDS) await graphGlyphs.expectFirstChar(id, BLANK);
      });
    }
  );

  test(
    'GIVEN a prediction on app#build, a live run wins and an ended run gives its glyph slot to the prediction',
    { annotation: SPEC_7 },
    async ({ graphPrediction, graphTaskHost, graphGlyphs }): Promise<void> => {
      await test.step('WHEN app#build runs and is predicted cached', async () => {
        await graphPrediction.open(true);
        await graphTaskHost.sendRuns({ 'app#build': 'running' }, { 'app#build': 'cached' });
      });

      await test.step('THEN it draws the live run glyph, not history', async () =>
        graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.sync));

      await test.step('WHEN the run has passed and the prediction is still cached', async () =>
        graphTaskHost.sendRuns({ 'app#build': 'passed' }, { 'app#build': 'cached' }));

      await test.step('THEN it draws history', async () => graphGlyphs.expectFirstChar('app#build', HISTORY));

      await test.step('WHEN the run has passed and the prediction is not cached', async () =>
        graphTaskHost.sendRuns({ 'app#build': 'passed' }, { 'app#build': 'notCached' }));

      await test.step('THEN it draws the pass glyph', async () => graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.pass));
    }
  );

  test(
    'GIVEN the toggle off, the Show cache prediction box posts setViewToggle, and the host turning predictionShown on makes the page post the drawn packages once',
    { annotation: SPEC_7 },
    async ({ graphPrediction, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened with predictionShown false', async () => graphPrediction.open(false));

      await test.step('THEN the box is unticked and no packages are posted', async () => {
        await graphPrediction.expectTicked(false);
        await graphTaskHost.expectShownTaskPackages([]);
      });

      await test.step('WHEN the box is ticked', async () => graphPrediction.tick());

      await test.step('THEN the page posts setViewToggle prediction shown', async () => graphPrediction.expectTogglePosts([TICKED]));

      await test.step('WHEN the host turns predictionShown on', async () => graphPrediction.sendState(true));

      await test.step('THEN the page posts the drawn packages', async () => graphTaskHost.expectShownTaskPackages([PACKAGES]));

      await test.step('WHEN the host sends the same state again', async () => graphPrediction.sendState(true));

      await test.step('THEN the packages were posted once', async () => graphTaskHost.expectShownTaskPackages([PACKAGES]));
    }
  );

  test(
    'GIVEN a panel restored in packages mode with the toggle on, nothing is posted until task mode is entered, and each entry posts once',
    { annotation: SPEC_7 },
    async ({ graphPrediction, graphTaskHost, graphTask }): Promise<void> => {
      await test.step('WHEN the page is restored in packages mode with predictionShown true', async () =>
        graphPrediction.openInPackages(true));

      await test.step('THEN no packages are posted', async () => graphTaskHost.expectShownTaskPackages([]));

      await test.step('WHEN task mode is entered', async () => graphTask.enter());

      await test.step('THEN the drawn packages are posted', async () => graphTaskHost.expectShownTaskPackages([PACKAGES]));

      await test.step('WHEN packages mode is entered again', async () => graphTask.leave());

      await test.step('THEN still one post', async () => graphTaskHost.expectShownTaskPackages([PACKAGES]));

      await test.step('WHEN task mode is entered again', async () => graphTask.enter());

      await test.step('THEN a second post names the same packages', async () =>
        graphTaskHost.expectShownTaskPackages([PACKAGES, PACKAGES]));
    }
  );
});
