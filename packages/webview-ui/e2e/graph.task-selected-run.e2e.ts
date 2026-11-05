import { expect, test } from './graph-task.fixture.ts';
import { CONTINUOUS_OUTLINE, RUNNING_OUTLINE, RUN_RING, SELECTION_RING } from './test/common/graph-run-colours.const.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';

const UB5B = { description: 'UB5b spec 2.2, 4', type: 'requirement' };

const TASK_TIDY = { description: 'U1 phase 2, U1-5', type: 'requirement' };

/** The dark stub's `--vscode-charts-green`, `#89d185`, as Cytoscape and the panel icon report it. */
const CONTINUOUS_RGB = 'rgb(137, 209, 133)';

test.describe('FEATURE: a selected task with a run state', () => {
  test(
    'GIVEN app#build running in the dark theme, selecting it swaps its run ring for the selection ring and deselecting brings it back',
    { annotation: TASK_TIDY },
    async ({ graphCanvas, graphGlyphs, graphLook, graphTaskHost, graphTaskProbe, graphTaskRings }): Promise<void> => {
      await test.step('WHEN the chosen task graph is opened', async (): Promise<void> => graphGlyphs.openChosen());

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND app#build is reported running', async (): Promise<void> =>
        graphTaskHost.sendRuns({ 'app#build': 'running' }));

      await test.step('THEN it has the 2 wide run outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline('app#build', RUNNING_OUTLINE));

      await test.step('AND the run ring is what is drawn', async (): Promise<void> =>
        graphTaskRings.expectRings('app#build', RUN_RING));

      await test.step('WHEN it is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('THEN its run outline is gone', async (): Promise<void> => graphTaskProbe.expectRunOutline('app#build', null));

      await test.step('AND the selection ring alone is drawn', async (): Promise<void> =>
        graphTaskRings.expectRings('app#build', SELECTION_RING));

      await test.step('AND its label still starts with the running glyph', async (): Promise<void> =>
        graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.sync));

      await test.step('WHEN the background is tapped', async (): Promise<void> => graphCanvas.tapBackground());

      await test.step('THEN its run outline is back', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline('app#build', RUNNING_OUTLINE));
    }
  );

  test(
    'GIVEN app#build continuous in the dark theme, it has the green outline and the pulse glyph, and its panel reads Continuous with Stop',
    { annotation: UB5B },
    async ({ graphCanvas, graphGlyphs, graphLook, graphTaskDetails, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the chosen task graph is opened', async (): Promise<void> => graphGlyphs.openChosen());

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND app#build is reported continuous', async (): Promise<void> =>
        graphTaskHost.sendRuns({ 'app#build': 'continuous' }));

      await test.step('THEN it has the 2 wide green outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline('app#build', CONTINUOUS_OUTLINE));

      await test.step('AND its label starts with the pulse glyph', async (): Promise<void> =>
        graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.pulse));

      await test.step('WHEN it is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('THEN the panel reads Continuous', async (): Promise<void> => graphTaskDetails.expectState('Continuous'));

      await test.step('AND its state icon is green', async (): Promise<void> =>
        graphTaskDetails.expectStateIconColour('continuous', CONTINUOUS_RGB));

      await test.step('AND a Stop button shows', async (): Promise<void> => expect(graphTaskDetails.stop).toBeVisible());
    }
  );
});
