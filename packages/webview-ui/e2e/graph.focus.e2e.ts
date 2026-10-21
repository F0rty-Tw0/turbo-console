import type { Camera } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { without } from './test/utils/graph-controls.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const AC3 = { description: 'M4-2 AC3', type: 'requirement' };

const RF2 = { description: 'M4-2 Review Focus 2', type: 'requirement' };

const ALL = stateNamesOf(CONTROLS_CACHED_STUB);

const UI_AT_1 = ['ui', 'core', 'web', 'admin'];

const CORE_AT_1 = ['core', 'config', 'data', 'ui'];

const CORE_AT_2 = ['core', 'config', 'base', 'data', 'ui', 'web', 'admin'];

const LIB = ['base', 'config', 'core', 'data'];

test.describe('FEATURE: graph focus', () => {
  test(
    'GIVEN a package focused, its neighbours at depth 1 stay visible, it is selected and locked',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND ui is focused', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('THEN ui and its neighbours are visible', async (): Promise<void> => graphCamera.expectVisible(UI_AT_1));

      await test.step('AND the count reads 4 of 8', async (): Promise<void> => graphControls.expectCount(4, 8));

      await test.step('AND ui is selected', async (): Promise<void> => graphProbe.expectSelected('ui'));

      await test.step('AND the ui row is locked', async (): Promise<void> => graphList.expectRowLocked('ui'));

      await test.step('AND the docs row is dimmed', async (): Promise<void> => graphList.expectRowDimmed('docs'));

      await test.step('AND Show all is enabled', async (): Promise<void> => graphControls.expectShowAllDisabled(false));
    }
  );

  test(
    'GIVEN the focused package in a group, toggling the group never unchecks the focused row',
    { annotation: RF2 },
    async ({ graphCamera, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the ui row is unchecked', async (): Promise<void> => graphList.toggleRow('ui'));

      await test.step('AND ui is focused', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('AND the packages group is toggled', async (): Promise<void> => graphList.toggleGroup('packages (5)'));

      await test.step('THEN the ui row is locked', async (): Promise<void> => graphList.expectRowLocked('ui'));

      await test.step('AND the packages group is unchecked', async (): Promise<void> =>
        graphList.expectGroupChecked('packages (5)', false));

      await test.step('AND ui is still visible', async (): Promise<void> => graphCamera.expectVisible(['ui', 'web', 'admin']));

      await test.step('WHEN the packages group is toggled again', async (): Promise<void> => graphList.toggleGroup('packages (5)'));

      await test.step('THEN the ui row is locked', async (): Promise<void> => graphList.expectRowLocked('ui'));

      await test.step('AND ui is still visible', async (): Promise<void> => graphCamera.expectVisible(UI_AT_1));

      await test.step('WHEN the packages group is toggled a third time', async (): Promise<void> =>
        graphList.toggleGroup('packages (5)'));

      await test.step('AND the focus is cleared', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('THEN the ui row is checked', async (): Promise<void> => graphList.expectRowChecked('ui', true));

      await test.step('AND ui is visible with docs, admin and web', async (): Promise<void> =>
        graphCamera.expectVisible(['docs', 'admin', 'web', 'ui']));
    }
  );

  test(
    'GIVEN core focused, typing a depth refocuses at once and keeps the selection',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND core is focused', async (): Promise<void> => graphList.focusOn('core'));

      await test.step('AND the depth 2 is typed', async (): Promise<void> => graphControls.setDepth('2'));

      await test.step('THEN the depth 2 neighbourhood is visible', async (): Promise<void> => graphCamera.expectVisible(CORE_AT_2));

      await test.step('AND core is still selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('WHEN the depth 1 is typed', async (): Promise<void> => graphControls.setDepth('1'));

      await test.step('THEN the depth 1 neighbourhood is visible', async (): Promise<void> => graphCamera.expectVisible(CORE_AT_1));
    }
  );

  test(
    'GIVEN ui focused, checking the lib tag keeps ui and the lib packages near it',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND ui is focused', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('AND the lib tag is checked', async (): Promise<void> => graphControls.toggleTag('lib'));

      await test.step('THEN ui and core are visible', async (): Promise<void> => graphCamera.expectVisible(['ui', 'core']));
    }
  );

  test(
    'GIVEN core focused and ui tapped, focusing core again clears the focus and keeps ui selected',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND core is focused', async (): Promise<void> => graphList.focusOn('core'));

      await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('THEN ui is selected', async (): Promise<void> => graphProbe.expectSelected('ui'));

      await test.step('WHEN core is focused again', async (): Promise<void> => graphList.focusOn('core'));

      await test.step('THEN every package is visible', async (): Promise<void> => graphCamera.expectVisible(ALL));

      await test.step('AND ui is still selected', async (): Promise<void> => graphProbe.expectSelected('ui'));
    }
  );

  test(
    'GIVEN ui focused and the lib tag checked, focusing ui again clears the focus and selects nothing the tag hides',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND ui is focused', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('AND the lib tag is checked', async (): Promise<void> => graphControls.toggleTag('lib'));

      await test.step('THEN ui and core are visible', async (): Promise<void> => graphCamera.expectVisible(['ui', 'core']));

      await test.step('WHEN ui is focused again', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('THEN only the lib packages are visible', async (): Promise<void> => graphCamera.expectVisible(LIB));

      await test.step('AND nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test(
    'GIVEN web focused, unchecking data removes it from the neighbourhood',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND web is focused', async (): Promise<void> => graphList.focusOn('web'));

      await test.step('AND the data row is unchecked', async (): Promise<void> => graphList.toggleRow('data'));

      await test.step('THEN web and ui are visible', async (): Promise<void> => graphCamera.expectVisible(['web', 'ui']));
    }
  );

  test(
    'GIVEN a focus, a tag and a search, Show all clears focus and tags but keeps selection and search',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphControls, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND core is focused', async (): Promise<void> => graphList.focusOn('core'));

      await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('AND the ui tag is checked', async (): Promise<void> => graphControls.toggleTag('ui'));

      await test.step('AND the search is a', async (): Promise<void> => graphControls.search('a'));

      await test.step('WHEN Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN every package is visible', async (): Promise<void> => graphCamera.expectVisible(ALL));

      await test.step('AND Show all is disabled', async (): Promise<void> => graphControls.expectShowAllDisabled(true));

      await test.step('AND ui is still selected', async (): Promise<void> => graphProbe.expectSelected('ui'));

      await test.step('AND the search is still a', async (): Promise<void> => graphControls.expectSearchValue('a'));
    }
  );

  test(
    'GIVEN a package unchecked, Re-layout lays out every package, posts them all and keeps the filter',
    { annotation: AC3 },
    async ({ graphCamera, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('AND Re-layout is pressed', async (): Promise<void> => graphPage.pressButton('Re-layout'));

      await test.step('THEN the layout engine is ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND the positions of all eight packages were posted', async (): Promise<void> =>
        graphHost.expectPositionsPosted(CONTROLS_CACHED_STUB.hash, ALL));

      await test.step('AND web is still not visible', async (): Promise<void> => graphCamera.expectVisible(without(ALL, ['web'])));
    }
  );

  test(
    'GIVEN the only package of a folder focused, the folder group is checked and locked',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND docs is focused', async (): Promise<void> => graphList.focusOn('docs'));

      await test.step('THEN the root group is locked', async (): Promise<void> => graphList.expectGroupLocked('(root) (1)'));

      await test.step('AND only docs is visible', async (): Promise<void> => graphCamera.expectVisible(['docs']));
    }
  );

  test(
    'GIVEN a zoomed-out graph, focusing a package fits the camera to the visible packages',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      const before = await test.step('AND the camera is noted', async (): Promise<Camera> => graphCamera.camera());

      await test.step('WHEN core is focused', async (): Promise<void> => graphList.focusOn('core'));

      await test.step('THEN every visible package is inside the container', async (): Promise<void> =>
        graphCamera.expectVisibleInView());

      await test.step('AND the camera moved', async (): Promise<void> => graphCamera.expectCameraNot(before));
    }
  );
});
