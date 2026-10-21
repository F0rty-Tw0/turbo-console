import type { Camera, FocusStep } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { without } from './test/utils/graph-controls.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const RF1 = { description: 'M4-2 Review Focus 1', type: 'requirement' };

const ALL = stateNamesOf(CONTROLS_CACHED_STUB);

const ALL_BUT_DOCS = without(ALL, ['docs']);

const CORE_AT_1 = ['core', 'config', 'data', 'ui'];

const DOWN_THREE: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowDown', focus: 'apps (2)' },
  { key: 'ArrowDown', focus: 'admin' }
];

const DOWN_TO_SHOW_DOCS: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowLeft', focus: 'Show docs' }
];

const END_TO_CORE: FocusStep[] = [
  { key: 'End', focus: 'ui' },
  { key: 'ArrowUp', focus: 'data' },
  { key: 'ArrowUp', focus: 'core' }
];

const VERTICAL_WALK: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowDown', focus: 'apps (2)' },
  { key: 'ArrowDown', focus: 'admin' },
  { key: 'ArrowUp', focus: 'apps (2)' },
  { key: 'Home', focus: '(root) (1)' },
  { key: 'End', focus: 'ui' },
  { key: 'ArrowDown', focus: 'ui' },
  { key: 'Home', focus: '(root) (1)' },
  { key: 'ArrowUp', focus: '(root) (1)' }
];

const GRID_WALK: FocusStep[] = [
  ...DOWN_THREE,
  { key: 'ArrowRight', focus: 'Focus admin' },
  { key: 'ArrowRight', focus: 'Focus admin' },
  { key: 'ArrowLeft', focus: 'admin' },
  { key: 'ArrowLeft', focus: 'Show admin' },
  { key: 'ArrowLeft', focus: 'Show admin' },
  { key: 'ArrowUp', focus: 'apps (2)' },
  { key: 'ArrowRight', focus: 'apps (2)' },
  { key: 'ArrowDown', focus: 'Show admin' },
  { key: 'ArrowDown', focus: 'Show web' },
  { key: 'ArrowRight', focus: 'web' },
  { key: 'ArrowRight', focus: 'Focus web' },
  { key: 'ArrowDown', focus: 'packages (5)' },
  { key: 'ArrowDown', focus: 'Focus base' }
];

const TO_FOCUS_DOCS: FocusStep[] = [
  { key: 'ArrowRight', focus: 'docs' },
  { key: 'ArrowRight', focus: 'Focus docs' }
];

const DOWN_TO_FOCUS_WEB: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowDown', focus: 'apps (2)' },
  { key: 'ArrowDown', focus: 'admin' },
  { key: 'ArrowDown', focus: 'web' },
  { key: 'ArrowRight', focus: 'Focus web' }
];

const LEFT_TO_SHOW_WEB: FocusStep[] = [
  { key: 'ArrowLeft', focus: 'web' },
  { key: 'ArrowLeft', focus: 'Show web' }
];

const TAB_PAST_SEARCH: FocusStep[] = [
  { key: 'Tab', focus: 'Focus depth' },
  { key: 'Tab', focus: 'app' },
  { key: 'Tab', focus: 'lib' },
  { key: 'Tab', focus: 'ui' },
  { key: 'Tab', focus: 'Show all' },
  { key: 'Tab', focus: '(root) (1)' }
];

test.describe('FEATURE: graph controls keyboard', () => {
  test(
    'GIVEN the controls graph, the package list is one Tab stop that lands on the first group checkbox',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN the grid holds three headers and eight rows', async (): Promise<void> =>
        graphControls.expectGridShape(3, 8));

      await test.step('AND the list has one Tab stop', async (): Promise<void> => graphKeys.expectListTabStops(1));

      await test.step('AND the focused control is a checkbox', async (): Promise<void> => graphKeys.expectFocusedRole('checkbox'));
    }
  );

  test(
    'GIVEN the first group checkbox focused, Down, Up, Home and End walk the lines and stop at both ends',
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN each key lands on its line and the ends hold', async (): Promise<void> =>
        graphKeys.expectWalk(VERTICAL_WALK));
    }
  );

  test(
    'GIVEN a row name focused, Left and Right walk its cells and Up and Down keep the remembered cell',
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN each key lands on its cell, the row ends hold and headers have one cell', async (): Promise<void> =>
        graphKeys.expectWalk(GRID_WALK));
    }
  );

  test(
    'GIVEN the first group checkbox focused, Space on a row checkbox hides it and Space on Focus selects it alone',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN Down and Left reach the docs checkbox', async (): Promise<void> =>
        graphKeys.expectWalk(DOWN_TO_SHOW_DOCS));

      await test.step('WHEN Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN every package but docs is visible', async (): Promise<void> => graphCamera.expectVisible(ALL_BUT_DOCS));

      await test.step('AND Right and Right reach the docs Focus button', async (): Promise<void> =>
        graphKeys.expectWalk(TO_FOCUS_DOCS));

      await test.step('WHEN Space is pressed on Focus', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN only docs is visible', async (): Promise<void> => graphCamera.expectVisible(['docs']));

      await test.step('AND docs is selected', async (): Promise<void> => graphProbe.expectSelected('docs'));
    }
  );

  test(
    'GIVEN a row name focused, Enter selects it and a second Enter opens its details once without moving the camera',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN End, Up and Up reach the core name', async (): Promise<void> => graphKeys.expectWalk(END_TO_CORE));

      await test.step('WHEN Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN core is selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('AND no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphPage.pressKey('ArrowRight'));

      await test.step('AND Space is pressed on Focus', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN core and its dependencies are visible', async (): Promise<void> => graphCamera.expectVisible(CORE_AT_1));

      const fitted = await test.step('AND the camera is noted', async (): Promise<Camera> => graphCamera.camera());

      await test.step('WHEN Left is pressed', async (): Promise<void> => graphPage.pressKey('ArrowLeft'));

      await test.step('AND Enter is pressed on the core name', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host received one openDetails for core', async (): Promise<void> =>
        graphHost.expectOpenDetails('core'));

      await test.step('AND the camera has not moved', async (): Promise<void> => graphCamera.expectCamera(fitted));
    }
  );

  test(
    'GIVEN a row name focused, Space selects it and never opens its details',
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN End, Up and Up reach the core name', async (): Promise<void> => graphKeys.expectWalk(END_TO_CORE));

      await test.step('WHEN Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN core is selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('AND no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );

  test(
    'GIVEN a search that leaves one row, Down enters the list and Enter in the search selects and centres that row',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the search is reached by Tab', async (): Promise<void> => graphKeys.tabTo('Search packages'));

      await test.step('AND web is typed', async (): Promise<void> => graphKeys.type('web'));

      await test.step('AND Down is pressed', async (): Promise<void> => graphPage.pressKey('ArrowDown'));

      await test.step('THEN the first listed line holds focus', async (): Promise<void> => graphKeys.expectFocusedName('apps (2)'));

      await test.step('WHEN focus goes back to the search', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is selected', async (): Promise<void> => graphProbe.expectSelected('web'));

      await test.step('AND web is centred', async (): Promise<void> => graphCamera.expectCentred('web'));
    }
  );

  test(
    'GIVEN docs hidden and a search that lists only docs, Enter in the search selects nothing',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN Down and Left reach the docs checkbox', async (): Promise<void> =>
        graphKeys.expectWalk(DOWN_TO_SHOW_DOCS));

      await test.step('WHEN Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN every package but docs is visible', async (): Promise<void> => graphCamera.expectVisible(ALL_BUT_DOCS));

      await test.step('WHEN focus goes back to the search', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND docs is typed', async (): Promise<void> => graphKeys.type('docs'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test(
    'GIVEN the list focused on a row a search then hides, Tab leads to the first header checkbox',
    { annotation: RF1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN Down three times reaches the admin name', async (): Promise<void> => graphKeys.expectWalk(DOWN_THREE));

      await test.step('WHEN focus goes back to the search', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND docs is typed', async (): Promise<void> => graphKeys.type('docs'));

      await test.step('THEN Tab walks depth, tags and Show all, then enters the list at the first header checkbox', async (): Promise<void> =>
        graphKeys.expectWalk(TAB_PAST_SEARCH));
    }
  );

  test(
    'GIVEN nothing filtered, Space on Show all changes nothing and Space on a locked row checkbox is ignored',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND Show all is reached by Tab', async (): Promise<void> => graphKeys.tabTo('Show all'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN Show all is still disabled', async (): Promise<void> => graphControls.expectShowAllDisabled(true));

      await test.step('AND Show all still holds focus', async (): Promise<void> => graphKeys.expectFocusedName('Show all'));

      await test.step('AND all eight packages are counted as visible', async (): Promise<void> => graphControls.expectCount(8, 8));

      await test.step('WHEN the list is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down four times and Right reach the web Focus button', async (): Promise<void> =>
        graphKeys.expectWalk(DOWN_TO_FOCUS_WEB));

      await test.step('AND Space is pressed on Focus', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN web and its two dependencies are counted as visible', async (): Promise<void> =>
        graphControls.expectCount(3, 8));

      await test.step('AND the web checkbox is locked', async (): Promise<void> => graphControls.expectRowLocked('web'));

      await test.step('WHEN Left and Left reach the web checkbox', async (): Promise<void> => graphKeys.expectWalk(LEFT_TO_SHOW_WEB));

      await test.step('AND Space is pressed on the locked checkbox', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN the web checkbox is still locked', async (): Promise<void> => graphControls.expectRowLocked('web'));

      await test.step('AND three of eight packages are still visible', async (): Promise<void> => graphControls.expectCount(3, 8));
    }
  );

  test(
    'GIVEN a package selected by tap, a tap on the same node under a search that hides its row keeps the row current and focuses the graph',
    { annotation: AC1 },
    async ({ graphCanvas, graphControls, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN the core row is current', async (): Promise<void> => graphControls.expectRowCurrent('core'));

      await test.step('WHEN the search is reached by Shift+Tab', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND xyz is typed', async (): Promise<void> => graphKeys.type('xyz'));

      await test.step('THEN no row is listed', async (): Promise<void> => graphControls.expectRowsListed([]));

      await test.step('WHEN core is tapped again', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN the core row is still current', async (): Promise<void> => graphControls.expectRowCurrent('core'));

      await test.step('AND the graph container holds focus', async (): Promise<void> => graphPage.expectContainerFocused());
    }
  );
});
