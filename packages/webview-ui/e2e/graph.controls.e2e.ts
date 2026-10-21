import type { Camera } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { DIAMOND_CHAIN_CACHED_STUB, ERROR_STUB } from './test/stubs/graph-state.stub.ts';

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const AC5 = { description: 'M4-2 AC5', type: 'requirement' };

const RF5 = { description: 'M4-2 Review Focus 5', type: 'requirement' };

test.describe('FEATURE: graph controls panel', () => {
  test(
    'GIVEN no host state, the Controls button is disabled and the panel is hidden',
    { annotation: AC1 },
    async ({ graphControls, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened without a host', async (): Promise<void> => graphPage.open({ host: false }));

      await test.step('THEN the page is in its pre-state', async (): Promise<void> => graphPage.expectPreState());

      await test.step('AND Controls is disabled', async (): Promise<void> => graphPage.expectDisabled('Controls'));

      await test.step('AND the panel is hidden', async (): Promise<void> => graphControls.expectOpen(false));
    }
  );

  test(
    'GIVEN the controls graph, the panel lists its groups, rows, tags and count under the CSP',
    { annotation: AC5 },
    async ({ graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the groups are listed with their counts', async (): Promise<void> =>
        graphList.expectGroups(['(root) (1)', 'apps (2)', 'packages (5)']));

      await test.step('AND the grid holds three headers and eight rows', async (): Promise<void> => graphList.expectGridShape(3, 8));

      await test.step('AND the tags are listed', async (): Promise<void> => graphControls.expectTags(['app', 'lib', 'ui']));

      await test.step('AND all eight packages are counted as visible', async (): Promise<void> => graphControls.expectCount(8, 8));

      await test.step('AND Show all is disabled', async (): Promise<void> => graphControls.expectShowAllDisabled(true));

      await test.step('AND the depth is 1', async (): Promise<void> => graphControls.expectDepthValue('1'));

      await test.step('AND no CSP violation was reported', async (): Promise<void> => graphPage.expectNoViolations());

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN a graph without tags, the panel has no Tags fieldset',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND an untagged graph is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('THEN there is no Tags fieldset', async (): Promise<void> => graphControls.expectNoTagsFieldset());

      await test.step('AND the one folder group is listed', async (): Promise<void> => graphList.expectGroups(['packages (7)']));
    }
  );

  test(
    'GIVEN a zoomed and panned graph, collapsing the panel resizes the canvas and moves no camera',
    { annotation: RF5 },
    async ({ graphCamera, graphCanvas, graphControls, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      const before = await test.step('AND the camera is noted', async (): Promise<Camera> => graphCamera.camera());

      const width = await test.step('AND the container width is noted', async (): Promise<number> => graphCamera.containerWidth());

      await test.step('WHEN the Controls button is pressed', async (): Promise<void> => graphControls.toggle());

      await test.step('THEN the panel is hidden', async (): Promise<void> => graphControls.expectOpen(false));

      await test.step('AND the button reads collapsed', async (): Promise<void> => graphControls.expectExpanded(false));

      await test.step('AND the button is still named Controls', async (): Promise<void> => graphControls.expectToggleName('Controls'));

      await test.step('AND the container is wider', async (): Promise<void> => graphCamera.expectContainerWidthAbove(width));

      await test.step('AND zoom and pan are as before', async (): Promise<void> => graphCamera.expectCamera(before));

      await test.step('AND nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('WHEN the Controls button is pressed again', async (): Promise<void> => graphControls.toggle());

      await test.step('THEN the panel is open', async (): Promise<void> => graphControls.expectOpen(true));

      await test.step('AND the container is as wide as before', async (): Promise<void> => graphCamera.expectContainerWidth(width));
    }
  );

  test(
    'GIVEN a shown graph, an error state hides the panel with the rest of the page',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

      await test.step('AND an error state is sent', async (): Promise<void> => graphHost.sendState(ERROR_STUB));

      await test.step('THEN the error text is shown', async (): Promise<void> => graphPage.expectText('turbo exited with code 1'));

      await test.step('AND the panel is hidden', async (): Promise<void> => graphControls.expectOpen(false));
    }
  );

  test(
    'GIVEN a package unchecked, the Controls button shows filters on until Show all',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphControls.toggle());

      await test.step('THEN the button is named Controls (filters on)', async (): Promise<void> =>
        graphControls.expectToggleName('Controls (filters on)'));

      await test.step('WHEN the panel is opened', async (): Promise<void> => graphControls.toggle());

      await test.step('AND Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN the button is named Controls', async (): Promise<void> => graphControls.expectToggleName('Controls'));
    }
  );
});
