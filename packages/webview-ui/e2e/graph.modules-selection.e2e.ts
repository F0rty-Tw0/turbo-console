import { D9_IDS, VIEWS_IDS } from './common/graph-modules.const.ts';
import { expect, test } from './graph-modules.fixture.ts';

const MODULES = { description: '2026-11-22-package-modules-graph spec 7.4', type: 'requirement' };

const INDEX_ID = 'file:index.ts';

const VIEWS_ID = 'dir:src/views';

const MODEL_UTIL_ID = 'dir:src/model/util';

const MAIN_ID = 'file:src/views/main.ts';

/** D9 with model open into its one folder, util, drawn as a card. */
const MODEL_OPEN_IDS = [...D9_IDS, MODEL_UTIL_ID];

test.describe('FEATURE: package modules selection across folder taps', () => {
  test(
    'GIVEN index.ts selected on the focused canvas, tapping the unrelated model folder open keeps index.ts selected and the focus',
    { annotation: MODULES },
    async ({ graphCanvas, graphModules, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9, the canvas focused and index.ts tapped', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.container.focus();
        await graphCanvas.tapNode(INDEX_ID);
        await graphModules.expectState(INDEX_ID, 'selected');
      });

      await test.step('AND the model card is tapped open', async (): Promise<void> => {
        await graphCanvas.tapNode('dir:src/model');
        await graphModules.expectIds(MODEL_OPEN_IDS);
        await graphModules.expectState(MODEL_UTIL_ID, 'dimmed');
      });

      await test.step('THEN index.ts is still selected and views still lit as its neighbour', async (): Promise<void> => {
        await graphModules.expectState(INDEX_ID, 'selected');
        await graphModules.expectState(VIEWS_ID, 'highlighted');
      });

      await test.step('AND the canvas keeps keyboard focus', async (): Promise<void> => expect(graphCanvas.container).toBeFocused());
    }
  );

  test(
    'GIVEN main.ts selected inside views on the focused canvas, collapsing views selects the views card and keeps the focus',
    { annotation: MODULES },
    async ({ graphCanvas, graphModules, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown, views tapped open, the canvas focused and main.ts tapped', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode(VIEWS_ID);
        await graphModules.expectIds(VIEWS_IDS);
        await graphCanvas.container.focus();
        await graphCanvas.tapNode(MAIN_ID);
        await graphModules.expectState(MAIN_ID, 'selected');
        await expect(graphCanvas.container).toBeFocused();
      });

      await test.step("AND the views box's title is tapped", async (): Promise<void> => graphModules.tapBoxTitle(VIEWS_ID));

      await test.step('THEN the collapsed views card is selected and index.ts lit as its neighbour', async (): Promise<void> => {
        await graphModules.expectState(VIEWS_ID, 'selected');
        await graphModules.expectState(INDEX_ID, 'highlighted');
      });

      await test.step('AND the canvas keeps keyboard focus', async (): Promise<void> => expect(graphCanvas.container).toBeFocused());
    }
  );

  test(
    'GIVEN main.ts selected inside views, collapsing views and tapping it open again selects main.ts again',
    { annotation: MODULES },
    async ({ graphCanvas, graphModules, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown, views tapped open and main.ts tapped', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode(VIEWS_ID);
        await graphModules.expectIds(VIEWS_IDS);
        await graphCanvas.tapNode(MAIN_ID);
        await graphModules.expectState(MAIN_ID, 'selected');
      });

      await test.step("AND the views box's title is tapped", async (): Promise<void> => {
        await graphModules.tapBoxTitle(VIEWS_ID);
        await graphModules.expectIds(D9_IDS);
        await graphModules.expectState(VIEWS_ID, 'selected');
      });

      await test.step('AND the views card is tapped open again', async (): Promise<void> => {
        await graphCanvas.tapNode(VIEWS_ID);
        await graphModules.expectIds(VIEWS_IDS);
      });

      await test.step('THEN main.ts is selected again and index.ts lit as its neighbour', async (): Promise<void> => {
        await graphModules.expectState(MAIN_ID, 'selected');
        await graphModules.expectState(INDEX_ID, 'highlighted');
      });
    }
  );
});
