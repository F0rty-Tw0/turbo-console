import { expect, test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { LOADING_STUB } from './test/stubs/graph-state.stub.ts';
import { THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';
import { LEGEND_TITLE } from '../src/graph/common/legend.const.ts';

const D9 = { description: '2026-10-27-u3-controls-nav D9', type: 'requirement' };

const GHOST_NODE_TERM = 'Dashed package: on the trace path, hidden by filters';

const GHOST_EDGE_TERM = 'Dashed line: trace link to a hidden package';

const TASK_BOX_TERM = 'Dashed box: the tasks of one package';

const FLOW_TERM = 'Moving dashes: the highlighted task chain (stops after 3 s idle; off with reduced motion or over 50 edges)';

const PACKAGE_TERMS = [
  'Package',
  'Selected package',
  'Focus target (bold name)',
  'Linked to the selection',
  'Not linked to the selection',
  'A → B: A depends on B',
  GHOST_NODE_TERM,
  GHOST_EDGE_TERM,
  'Folder',
  'Collapsed folder',
  '"<n> links": links bundled at a collapsed folder'
];

const TASK_TERMS = [
  TASK_BOX_TERM,
  FLOW_TERM,
  'Task running',
  'Task continuous',
  'Task passed',
  'Task failed',
  'Task stopped',
  'Task failed to start',
  'File passed',
  'File failed',
  'File cached (result from the cache)',
  'Dashed file: a live test'
];

test.describe('FEATURE: graph legend', () => {
  test(
    'GIVEN the details graph, the Legend button opens a popover of the package styles with its heading focused',
    { annotation: D9 },
    async ({ graphHost, graphLegend, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the Legend button has its title', async (): Promise<void> =>
        expect(graphLegend.button).toHaveAttribute('title', LEGEND_TITLE));

      await test.step('WHEN the Legend button is clicked', async (): Promise<void> => graphLegend.open());

      await test.step('THEN the popover is open with its heading focused', async (): Promise<void> => {
        await graphLegend.expectOpen(true);
        await graphLegend.expectHeadingFocused();
      });

      await test.step('AND it lists the package styles only', async (): Promise<void> => graphLegend.expectTerms(PACKAGE_TERMS));

      await test.step('AND the dashed package is drawn with a 4 2 dash', async (): Promise<void> =>
        expect(graphLegend.dashOf(GHOST_NODE_TERM, 'rect')).toHaveAttribute('stroke-dasharray', '4 2'));

      await test.step('AND the dashed line is drawn with a 6 3 dash', async (): Promise<void> =>
        expect(graphLegend.dashOf(GHOST_EDGE_TERM, 'line')).toHaveAttribute('stroke-dasharray', '6 3'));
    }
  );

  test(
    'GIVEN the open Legend, Escape closes it and returns focus to the button, and a click outside closes it',
    { annotation: D9 },
    async ({ graphCanvas, graphHost, graphLegend, graphPage }): Promise<void> => {
      await test.step('WHEN the details graph is shown and the Legend is opened', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphLegend.open();
        await graphLegend.expectOpen(true);
      });

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN the popover is closed and the Legend button is focused', async (): Promise<void> => {
        await graphLegend.expectOpen(false);
        await graphLegend.expectButtonFocused();
      });

      await test.step('WHEN the Legend is opened again and an empty spot of the graph is clicked', async (): Promise<void> => {
        await graphLegend.open();
        await graphLegend.expectOpen(true);
        await graphCanvas.tapBackground();
      });

      await test.step('THEN the popover is closed', async (): Promise<void> => graphLegend.expectOpen(false));
    }
  );

  test(
    'GIVEN the details graph and the Legend button focused, Enter opens the popover',
    { annotation: D9 },
    async ({ graphHost, graphLegend, graphPage }): Promise<void> => {
      await test.step('WHEN the details graph is shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('AND the Legend button is focused and Enter is pressed', async (): Promise<void> =>
        graphPage.pressOnButton('Legend', 'Enter'));

      await test.step('THEN the popover is open', async (): Promise<void> => graphLegend.expectOpen(true));
    }
  );

  test(
    'GIVEN the open Legend, a loading state closes it, so the graph returns with the Legend closed',
    { annotation: D9 },
    async ({ graphHost, graphLegend, graphPage }): Promise<void> => {
      await test.step('WHEN the details graph is shown and the Legend is opened', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphLegend.open();
        await graphLegend.expectOpen(true);
      });

      await test.step('AND the loading state and then the details graph are sent', async (): Promise<void> => {
        await graphHost.sendState(LOADING_STUB);
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the popover is closed', async (): Promise<void> => graphLegend.expectOpen(false));
    }
  );

  test(
    'GIVEN task mode with the umbrella drawn, the Legend lists the task styles only',
    { annotation: D9 },
    async ({ graphLegend, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page opens in task mode with the umbrella drawn', async (): Promise<void> => openUmbrella());

      await test.step('AND the Legend is opened', async (): Promise<void> => graphLegend.open());

      await test.step('THEN it lists the task styles only', async (): Promise<void> => graphLegend.expectTerms(TASK_TERMS));

      await test.step('AND the task box is drawn with a 4 4 dash', async (): Promise<void> =>
        expect(graphLegend.dashOf(TASK_BOX_TERM, 'rect')).toHaveAttribute('stroke-dasharray', '4 4'));

      await test.step('AND the moving dashes are a 6 6 pen over the undashed line', async (): Promise<void> => {
        await expect(graphLegend.swatchOf(FLOW_TERM).locator('line')).toHaveCount(2);
        await expect(graphLegend.dashOf(FLOW_TERM, 'line')).toHaveAttribute('stroke-dasharray', '6 6');
      });
    }
  );

  test(
    'GIVEN the open Legend, a theme change redraws its swatches in the new colours',
    { annotation: D9 },
    async ({ graphHost, graphLegend, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the details graph is shown and the Legend is opened', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphLegend.open();
      });

      await test.step('AND the light theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_LIGHT_STUB));

      await test.step('THEN the package swatch is framed in the light frame colour', async (): Promise<void> =>
        expect(graphLegend.frameOf('Package')).toHaveCSS('stroke', THEME_LIGHT_STUB.expected.frame));

      await test.step('AND the selected package swatch is framed in the light selection colour', async (): Promise<void> =>
        expect(graphLegend.frameOf('Selected package')).toHaveCSS('stroke', THEME_LIGHT_STUB.expected.selected));
    }
  );
});
