import type { ToolbarGroup, WidthChange } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { DETAILS_STUB, INPUT_OPTION_STUB } from './test/stubs/graph-details.stub.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const AC7 = { description: 'M4-3 AC7', type: 'requirement' };

const PANELS: ToolbarGroup = { name: 'Panels', buttons: ['Controls', 'Details'] };

const VIEW: ToolbarGroup = { name: 'View', buttons: ['Fit', 'Re-layout', 'Export image'] };

const GROUPS: ToolbarGroup[] = [PANELS, VIEW];

const CONTROLS_WIDTH_PX = 260;

const DETAILS_WIDTH_PX = 280;

test.describe('FEATURE: graph toolbar', () => {
  test(
    'GIVEN the details graph, the toolbar has a Panels group, a View group, two separators and a lone Clear selection, each with its icon',
    { annotation: AC1 },
    async ({ graphHost, graphPage, graphToolbar }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the Panels and View groups hold their buttons and Clear selection stands alone', async (): Promise<void> =>
        graphToolbar.expectGroups(GROUPS));

      await test.step('AND two separators divide the three parts', async (): Promise<void> => graphToolbar.expectSeparators(2));

      await test.step('AND Controls draws a left sidebar icon', async (): Promise<void> =>
        graphToolbar.expectIcon('Controls', 'layout-sidebar-left'));

      await test.step('AND Details draws a right sidebar icon', async (): Promise<void> =>
        graphToolbar.expectIcon('Details', 'layout-sidebar-right'));

      await test.step('AND Fit draws a screen-full icon', async (): Promise<void> => graphToolbar.expectIcon('Fit', 'screen-full'));

      await test.step('AND Re-layout draws a refresh icon', async (): Promise<void> =>
        graphToolbar.expectIcon('Re-layout', 'refresh'));

      await test.step('AND Export image draws a desktop-download icon', async (): Promise<void> =>
        graphToolbar.expectIcon('Export image', 'desktop-download'));

      await test.step('AND Clear selection draws a close icon', async (): Promise<void> =>
        graphToolbar.expectIcon('Clear selection', 'close'));
    }
  );

  test(
    'GIVEN the details graph, the Codicon stylesheet and font load under the graph CSP',
    { annotation: AC7 },
    async ({ graphHost, graphPage, graphToolbar }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the codicon font face is loaded', async (): Promise<void> => graphToolbar.expectCodiconLoaded());

      await test.step('AND no CSP violation was reported', async (): Promise<void> => graphPage.expectNoViolations());

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN theme input-option colours, a toggle is drawn in them while its panel is open and in none while it is collapsed',
    { annotation: AC7 },
    async ({ graphDetails, graphHost, graphPage, graphToolbar }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the input-option colours are set', async (): Promise<void> =>
        graphToolbar.setInputOptionVars(INPUT_OPTION_STUB));

      await test.step('THEN Controls is drawn pressed', async (): Promise<void> => graphToolbar.expectPressed('Controls', true));

      await test.step('AND Details is drawn pressed', async (): Promise<void> => graphToolbar.expectPressed('Details', true));

      await test.step('WHEN the Details panel is collapsed', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN Details is not drawn pressed', async (): Promise<void> => graphToolbar.expectPressed('Details', false));

      await test.step('AND Controls is still drawn pressed', async (): Promise<void> => graphToolbar.expectPressed('Controls', true));

      await test.step('AND Details reads collapsed', async (): Promise<void> => graphDetails.expectExpanded(false));

      await test.step('WHEN the Details panel is opened again', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN Details is drawn pressed', async (): Promise<void> => graphToolbar.expectPressed('Details', true));

      await test.step('AND Details reads expanded', async (): Promise<void> => graphDetails.expectExpanded(true));
    }
  );

  test(
    'GIVEN an unticked package, the Controls button shows filters on until Show all',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphList, graphPage, graphToolbar }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN filters on is shown', async (): Promise<void> => graphToolbar.expectFiltersOn(true));

      await test.step('WHEN Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN filters on is gone', async (): Promise<void> => graphToolbar.expectFiltersOn(false));
    }
  );

  test(
    'GIVEN an unticked tag, the Controls button shows filters on until Show all',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphPage, graphToolbar }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the app tag is unticked', async (): Promise<void> => graphControls.toggleTag('app'));

      await test.step('THEN filters on is shown', async (): Promise<void> => graphToolbar.expectFiltersOn(true));

      await test.step('WHEN Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN filters on is gone', async (): Promise<void> => graphToolbar.expectFiltersOn(false));
    }
  );

  test(
    'GIVEN a focused package, the Controls button shows filters on until Show all',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphList, graphPage, graphToolbar }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND ui is focused in the list', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('THEN filters on is shown', async (): Promise<void> => graphToolbar.expectFiltersOn(true));

      await test.step('WHEN Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN filters on is gone', async (): Promise<void> => graphToolbar.expectFiltersOn(false));
    }
  );

  test(
    'GIVEN the details graph, the controls panel is 260 px and the details panel 280 px, and collapsing either gives that width to the canvas',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the controls panel is 260 px wide', async (): Promise<void> =>
        graphControls.expectPanelWidth(CONTROLS_WIDTH_PX));

      await test.step('AND the details panel is 280 px wide', async (): Promise<void> =>
        graphDetails.expectPanelWidth(DETAILS_WIDTH_PX));

      const details = await test.step('WHEN the Details panel is collapsed', async (): Promise<WidthChange> =>
        graphDetails.toggleDetailsInOneTask());

      await test.step('THEN the canvas grew by 280 px', (): void =>
        expect(details.after - details.before).toBeCloseTo(DETAILS_WIDTH_PX, 0));

      await test.step('WHEN the Details panel is opened again', async (): Promise<void> => graphDetails.toggle());

      const controls = await test.step('AND the Controls panel is collapsed', async (): Promise<WidthChange> =>
        graphCamera.toggleControlsInOneTask());

      await test.step('THEN the canvas grew by 260 px', (): void =>
        expect(controls.after - controls.before).toBeCloseTo(CONTROLS_WIDTH_PX, 0));
    }
  );
});
