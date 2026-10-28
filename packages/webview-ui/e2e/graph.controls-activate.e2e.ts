import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { without } from './test/utils/graph-controls.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const ALL_BUT_DOCS = without(stateNamesOf(CONTROLS_CACHED_STUB), ['docs']);

const CORE_AT_1 = ['core', 'config', 'data', 'ui'];

const DOWN_TO_SHOW_DOCS: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowLeft', focus: 'Show docs' }
];

const END_TO_CORE: FocusStep[] = [
  { key: 'End', focus: 'ui' },
  { key: 'ArrowUp', focus: 'data' },
  { key: 'ArrowUp', focus: 'core' }
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

test.describe('FEATURE: graph controls keyboard activation', () => {
  test(
    'GIVEN the controls graph, Space on a row checkbox hides it and Space on Focus selects it alone',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND Down and Left are pressed', async (): Promise<FocusStep[]> =>
        graphKeys.walk(DOWN_TO_SHOW_DOCS));

      await test.step('THEN focus reaches the docs checkbox', (): void => expect(walked).toEqual(DOWN_TO_SHOW_DOCS));

      await test.step('WHEN Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN every package but docs is visible', async (): Promise<void> => graphCamera.expectVisible(ALL_BUT_DOCS));

      const moved = await test.step('WHEN Right and Right are pressed', async (): Promise<FocusStep[]> =>
        graphKeys.walk(TO_FOCUS_DOCS));

      await test.step('THEN focus reaches the docs Focus button', (): void => expect(moved).toEqual(TO_FOCUS_DOCS));

      await test.step('WHEN Space is pressed on Focus', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN only docs is visible', async (): Promise<void> => graphCamera.expectVisible(['docs']));

      await test.step('AND docs is selected', async (): Promise<void> => graphProbe.expectSelected('docs'));
    }
  );

  test(
    'GIVEN the controls graph, Enter on a row name selects it and a second Enter opens its details once without moving the camera',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND End, Up and Up are pressed', async (): Promise<FocusStep[]> => graphKeys.walk(END_TO_CORE));

      await test.step('THEN focus reaches the core name', (): void => expect(walked).toEqual(END_TO_CORE));

      await test.step('WHEN Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN core is selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('AND no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphPage.pressKey('ArrowRight'));

      await test.step('AND Space is pressed on Focus', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN core and its dependencies are visible', async (): Promise<void> => graphCamera.expectVisible(CORE_AT_1));

      await test.step('WHEN the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Left is pressed', async (): Promise<void> => graphPage.pressKey('ArrowLeft'));

      await test.step('AND Enter is pressed on the core name', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host received one openDetails for core', async (): Promise<void> =>
        graphHost.expectOpenDetails('core'));

      await test.step('AND the camera has not moved', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN the controls graph, Space on a row name selects it and never opens its details',
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND End, Up and Up are pressed', async (): Promise<FocusStep[]> => graphKeys.walk(END_TO_CORE));

      await test.step('THEN focus reaches the core name', (): void => expect(walked).toEqual(END_TO_CORE));

      await test.step('WHEN Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN core is selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('AND no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );

  test(
    'GIVEN the controls graph, Enter on the name of a package a filter hides selects nothing',
    { annotation: AC1 },
    async ({ graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('AND the web name button is focused', async (): Promise<void> => graphList.focusName('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test(
    'GIVEN the controls graph, Down from a search that leaves one row enters the list and Enter in the search selects and centres that row',
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
    'GIVEN the controls graph, Enter in a search that lists only a package a filter hides selects nothing',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphKeys, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND Down and Left are pressed', async (): Promise<FocusStep[]> =>
        graphKeys.walk(DOWN_TO_SHOW_DOCS));

      await test.step('THEN focus reaches the docs checkbox', (): void => expect(walked).toEqual(DOWN_TO_SHOW_DOCS));

      await test.step('WHEN Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN every package but docs is visible', async (): Promise<void> => graphCamera.expectVisible(ALL_BUT_DOCS));

      await test.step('WHEN focus goes back to the search', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND docs is typed', async (): Promise<void> => graphKeys.type('docs'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test(
    'GIVEN nothing filtered, Show all is hidden and Space on a locked row checkbox is ignored',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN Show all is hidden', async (): Promise<void> => graphControls.expectShowAllDisabled(true));

      await test.step('AND all eight packages are counted as visible', async (): Promise<void> => graphControls.expectCount(8, 8));

      await test.step('WHEN the list is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND Down four times and Right are pressed', async (): Promise<FocusStep[]> =>
        graphKeys.walk(DOWN_TO_FOCUS_WEB));

      await test.step('THEN focus reaches the web Focus button', (): void => expect(walked).toEqual(DOWN_TO_FOCUS_WEB));

      await test.step('WHEN Space is pressed on Focus', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN web and its two dependencies are counted as visible', async (): Promise<void> =>
        graphControls.expectCount(3, 8));

      await test.step('AND the web checkbox is locked', async (): Promise<void> => graphList.expectRowLocked('web'));

      const moved = await test.step('WHEN Left and Left are pressed', async (): Promise<FocusStep[]> =>
        graphKeys.walk(LEFT_TO_SHOW_WEB));

      await test.step('THEN focus reaches the web checkbox', (): void => expect(moved).toEqual(LEFT_TO_SHOW_WEB));

      await test.step('WHEN Space is pressed on the locked checkbox', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN the web checkbox is still locked', async (): Promise<void> => graphList.expectRowLocked('web'));

      await test.step('AND three of eight packages are still visible', async (): Promise<void> => graphControls.expectCount(3, 8));
    }
  );
});
