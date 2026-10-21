import { test } from './graph.fixture.ts';
import { DIAMOND_CHAIN_CACHED_STUB } from './test/stubs/graph-state.stub.ts';
import { THEME_DARK_STUB, THEME_HC_STUB, THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';

const AC6 = { description: 'M4-1 AC6', type: 'requirement' };

test.describe('FEATURE: graph theme', () => {
  test(
    'GIVEN dark theme variables, nodes and edges use them, and a switch to light recolours them',
    { annotation: AC6 },
    async ({ graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('THEN node fill, label and frame follow the dark variables', async (): Promise<void> =>
        graphLook.expectNodeColors('web', THEME_DARK_STUB.expected));

      await test.step('AND the edge colour follows them', async (): Promise<void> =>
        graphLook.expectEdgeColor(THEME_DARK_STUB.expected.edge));

      await test.step('WHEN the light theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_LIGHT_STUB));

      await test.step('THEN node fill, label and frame follow the light variables', async (): Promise<void> =>
        graphLook.expectNodeColors('web', THEME_LIGHT_STUB.expected));

      await test.step('AND the edge colour follows them', async (): Promise<void> =>
        graphLook.expectEdgeColor(THEME_LIGHT_STUB.expected.edge));
    }
  );

  test(
    'GIVEN high-contrast variables, the frame uses contrastBorder and a selected node uses focusBorder',
    { annotation: AC6 },
    async ({ graphCanvas, graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND the high-contrast theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_HC_STUB));

      await test.step('THEN the frame is contrastBorder, not panel-border', async (): Promise<void> =>
        graphLook.expectNodeColors('web', THEME_HC_STUB.expected));

      await test.step('WHEN web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('THEN its frame is the focusBorder colour', async (): Promise<void> =>
        graphLook.expectNodeColors('web', { ...THEME_HC_STUB.expected, frame: THEME_HC_STUB.expected.selected }));

      await test.step('AND its frame differs from every other node frame', async (): Promise<void> =>
        graphLook.expectSelectedFrameDiffers('web'));
    }
  );
});
