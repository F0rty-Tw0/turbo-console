import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { FOUND_UI_STUB } from './test/stubs/graph-explain.stub.ts';
import { DIAMOND_CHAIN_CACHED_STUB } from './test/stubs/graph-state.stub.ts';
import { tabStopsOf } from './test/utils/graph-focus-steps.spec.util.ts';

const AC7 = { description: 'M4-1 AC7', type: 'requirement' };

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const RF4 = { description: 'M4-1 Review Focus 4', type: 'requirement' };

const AC1_DETAILS = { description: 'M4-3 AC1', type: 'requirement' };

const NO_SELECTION_STOPS: FocusStep[] = tabStopsOf([
  'Packages',
  'Tasks',
  'Controls',
  'Details',
  'Fit',
  'Re-layout',
  'Export image',
  'Legend',
  'Search packages',
  'Focus depth',
  'Group by folder',
  'Show all',
  'packages (7)',
  'Package graph'
]);

const SELECTION_STOPS: FocusStep[] = tabStopsOf([
  'Re-layout',
  'Export image',
  'Legend',
  'Search packages',
  'Focus depth',
  'Group by folder',
  'Show all',
  'packages (7)',
  'Package graph',
  'Clear selection',
  'View Package Details · 0 tasks',
  'Focus',
  'Exclude',
  'Start trace',
  'config',
  'Explain core → config',
  'data',
  'Explain data → core',
  'ui',
  'Explain ui → core'
]);

const COLLAPSED_STOPS: FocusStep[] = tabStopsOf(['Details', 'Fit', 'Re-layout', 'Export image', 'Legend', 'Package graph']);

const LINK_STOPS: FocusStep[] = tabStopsOf([
  'Clear selection',
  'web',
  'ui',
  'Open package.json at line 6 (dependencies: ui)',
  'Open package.json at line 10 (devDependencies: ui)'
]);

const PICKING_STOPS: FocusStep[] = tabStopsOf(['Clear selection', 'Filter packages', 'data', 'ui']);

const TRACE_STOPS: FocusStep[] = tabStopsOf(['Clear selection', 'web', 'data']);

test.describe('FEATURE: graph keyboard', () => {
  test(
    'GIVEN a package selected by a tap, Enter posts openDetails for it',
    { annotation: AC7 },
    async ({ graphCanvas, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host received openDetails for core', async (): Promise<void> => graphHost.expectOpenDetails('core'));
    }
  );

  test(
    'GIVEN a selected package, holding Enter until it repeats posts openDetails once',
    { annotation: AC7 },
    async ({ graphCanvas, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND Enter is held until it repeats', async (): Promise<void> => graphPage.holdKey('Enter'));

      await test.step('THEN the host received one openDetails for core', async (): Promise<void> =>
        graphHost.expectOpenDetails('core'));
    }
  );

  test(
    'GIVEN no selection and the container focused, Enter posts nothing',
    { annotation: AC7 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('THEN the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

      await test.step('WHEN the container is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );

  test(
    'GIVEN a selection and a focused toolbar button, Enter and Escape act on the button only',
    { annotation: RF4 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the Fit button is focused', async (): Promise<void> => graphPage.focusButton('Fit'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());

      await test.step('WHEN Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN core is still selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('WHEN the Clear selection button is focused and Enter is pressed', async (): Promise<void> =>
        graphPage.pressOnButton('Clear selection', 'Enter'));

      await test.step('THEN the selection is cleared', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('AND still no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );

  test(
    'GIVEN no selection, Tab walks Packages, Tasks, Controls, Details, Fit, Re-layout, Export image, Legend, the search, depth, Show all, the package list, then the graph container',
    { annotation: AC7 },
    async ({ graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('THEN the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

      const walked = await test.step('WHEN Tab is pressed fourteen times', async (): Promise<FocusStep[]> =>
        graphKeys.walk(NO_SELECTION_STOPS));

      await test.step('THEN focus visited every stop in order', (): void => expect(walked).toEqual(NO_SELECTION_STOPS));
    }
  );

  test(
    'GIVEN a selection made by tap and Fit focused, Tab walks the toolbar, the controls, the container, then the details panel',
    { annotation: AC7 },
    async ({ graphCanvas, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the Fit button is focused', async (): Promise<void> => graphPage.focusButton('Fit'));

      const walked = await test.step('WHEN Tab is pressed twenty times', async (): Promise<FocusStep[]> =>
        graphKeys.walk(SELECTION_STOPS));

      await test.step('THEN focus visited every stop in order', (): void => expect(walked).toEqual(SELECTION_STOPS));
    }
  );

  test(
    'GIVEN tagged packages and Group by folder reached by Tab, Tab walks the app, lib and ui tags, then Show all',
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND Group by folder is reached by Tab', async (): Promise<void> => graphKeys.tabTo('Group by folder'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN app is focused', async (): Promise<void> => graphKeys.expectFocusedName('app'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN lib is focused', async (): Promise<void> => graphKeys.expectFocusedName('lib'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN ui is focused', async (): Promise<void> => graphKeys.expectFocusedName('ui'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN Show all is focused', async (): Promise<void> => graphPage.expectButtonFocused('Show all'));
    }
  );

  test(
    'GIVEN a collapsed panel and Controls focused, Tab skips the panel: Details, Fit, Re-layout, Export image, Legend, then the graph container',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphControls.toggle());

      await test.step('AND the Controls button is focused', async (): Promise<void> => graphPage.focusButton('Controls'));

      const walked = await test.step('WHEN Tab is pressed six times', async (): Promise<FocusStep[]> =>
        graphKeys.walk(COLLAPSED_STOPS));

      await test.step('THEN focus visited every stop in order', (): void => expect(walked).toEqual(COLLAPSED_STOPS));
    }
  );

  test(
    'GIVEN a tapped link and the graph focused, Tab walks Clear selection, the two ends, then each Open at line button',
    { annotation: AC1_DETAILS },
    async ({ graphHost, graphKeys, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('AND the graph is focused', async (): Promise<void> => graphPage.focusContainer());

      const walked = await test.step('WHEN Tab is pressed five times', async (): Promise<FocusStep[]> => graphKeys.walk(LINK_STOPS));

      await test.step('THEN focus visited every stop in order', (): void => expect(walked).toEqual(LINK_STOPS));
    }
  );

  test(
    'GIVEN a trace being picked, Tab walks Clear selection, the filter and the first candidates, and in the trace view Clear selection and the first steps',
    { annotation: AC1_DETAILS },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the graph is focused', async (): Promise<void> => graphPage.focusContainer());

      const picking = await test.step('WHEN Tab is pressed four times', async (): Promise<FocusStep[]> =>
        graphKeys.walk(PICKING_STOPS));

      await test.step('THEN focus visited Clear selection, the filter and the first two candidates', (): void =>
        expect(picking).toEqual(PICKING_STOPS));

      await test.step('WHEN core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND the graph is focused', async (): Promise<void> => graphPage.focusContainer());

      const trace = await test.step('AND Tab is pressed three times', async (): Promise<FocusStep[]> => graphKeys.walk(TRACE_STOPS));

      await test.step('THEN focus visited Clear selection and the first two steps', (): void => expect(trace).toEqual(TRACE_STOPS));
    }
  );
});
