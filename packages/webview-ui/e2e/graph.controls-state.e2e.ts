import type { ControlsFields } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB, CONTROLS_EDITED_STUB, PROTO_CONTROLS_STUB } from './test/stubs/graph-controls.stub.ts';
import { without } from './test/utils/graph-controls.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const AC4 = { description: 'M4-2 AC4', type: 'requirement' };

const RF3 = { description: 'M4-2 Review Focus 3', type: 'requirement' };

const RF4 = { description: 'M4-2 Review Focus 4', type: 'requirement' };

const DEFAULT_CONTROLS: ControlsFields = { controlsOpen: true, search: '', depth: 1, hidden: [], focus: null, tags: [] };

const ORIGIN = { x: 0, y: 0 };

const ALL = stateNamesOf(CONTROLS_CACHED_STUB);

const EDITED_BUT_WEB = without(stateNamesOf(CONTROLS_EDITED_STUB), ['web']);

const CORE_AT_2_LIBS = ['core', 'base', 'config', 'data'];

const M4_1_PAN = { x: 30, y: 40 };

const M4_1_VIEW = { hash: 'c0a1b2c3', zoom: 2, pan: M4_1_PAN, selected: 'core' };

const M4_1_RESTORED: GraphViewState = { ...M4_1_VIEW, ...DEFAULT_CONTROLS };

const PROTO_SAVED = {
  hash: 'f1f1f1f1',
  zoom: 1,
  pan: ORIGIN,
  selected: '__proto__',
  ...DEFAULT_CONTROLS,
  hidden: ['__proto__'],
  focus: 'constructor',
  tags: ['constructor']
};

const FOCUS_IN_HIDDEN_SAVED = {
  hash: 'c0a1b2c3',
  zoom: 1,
  pan: ORIGIN,
  selected: null,
  ...DEFAULT_CONTROLS,
  hidden: ['ui'],
  focus: 'ui'
};

const SAVED_CONTROLS: ControlsFields = {
  controlsOpen: false,
  search: 'a',
  depth: 2,
  hidden: ['docs'],
  focus: 'core',
  tags: ['lib']
};

const BAD_FIELDS_SAVED = { ...M4_1_VIEW, selected: null, depth: 7, search: 5, hidden: 'web', tags: [1] };

const BAD_FIELDS_RESTORED: GraphViewState = { ...M4_1_RESTORED, selected: null };

test.describe('FEATURE: graph controls saved state', () => {
  test(
    'GIVEN every control changed and the panel collapsed, reopening restores the controls and keeps the hand-moved camera',
    { annotation: AC4 },
    async ({ graphCamera, graphCanvas, graphControls, graphHost, graphList, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the depth is set to 2', async (): Promise<void> => graphControls.setDepth('2'));

      await test.step('AND core is focused', async (): Promise<void> => graphList.focusOn('core'));

      await test.step('AND the docs row is unchecked', async (): Promise<void> => graphList.toggleRow('docs'));

      await test.step('AND a is searched', async (): Promise<void> => graphControls.search('a'));

      await test.step('AND the lib tag is checked', async (): Promise<void> => graphControls.toggleTag('lib'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphControls.toggle());

      const carried = await test.step('AND the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the same state is sent again', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the controls are the saved ones', async (): Promise<void> =>
        graphLook.expectControlsFields(SAVED_CONTROLS));

      await test.step('AND zoom, pan and selection are the saved ones', async (): Promise<void> => graphLook.expectView(carried));

      await test.step('AND core, base, config and data are visible', async (): Promise<void> =>
        graphCamera.expectVisible(CORE_AT_2_LIBS));

      await test.step('AND no worker was created', async (): Promise<void> => graphHost.expectWorkers(0));
    }
  );

  test(
    'GIVEN only the panel collapsed, reopening restores it collapsed with every filter at its default',
    { annotation: AC4 },
    async ({ graphControls, graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphControls.toggle());

      await test.step('AND the page is reopened with the saved view', async (): Promise<GraphViewState> => graphHost.reopen());

      await test.step('AND the same state is sent again', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the controls are the defaults with the panel closed', async (): Promise<void> =>
        graphLook.expectControlsFields({ ...DEFAULT_CONTROLS, controlsOpen: false }));

      await test.step('AND the panel is hidden', async (): Promise<void> => graphControls.expectOpen(false));

      await test.step('AND the Controls button is collapsed', async (): Promise<void> => graphControls.expectExpanded(false));

      await test.step('AND the Controls button shows no filter mark', async (): Promise<void> =>
        graphControls.expectToggleName('Controls'));
    }
  );

  test(
    'GIVEN a saved view from M4-1 without the controls fields, the camera and selection are restored and the controls start at their defaults',
    { annotation: AC4 },
    async ({ graphCamera, graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened with an M4-1 saved view', async (): Promise<void> =>
        graphPage.open({ savedState: M4_1_VIEW }));

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the saved camera and selection are shown', async (): Promise<void> => graphLook.expectView(M4_1_RESTORED));

      await test.step('AND the controls are the defaults', async (): Promise<void> =>
        graphLook.expectControlsFields(DEFAULT_CONTROLS));

      await test.step('AND every package is visible', async (): Promise<void> => graphCamera.expectVisible(ALL));
    }
  );

  test(
    'GIVEN a hidden package, a focus and a moved camera saved, an edited graph keeps the surviving filters, fits to the visible nodes and does not save the dropped name back',
    { annotation: AC4 },
    async ({ graphCanvas, graphControls, graphHost, graphList, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the docs row is unchecked', async (): Promise<void> => graphList.toggleRow('docs'));

      await test.step('AND the admin row is unchecked', async (): Promise<void> => graphList.toggleRow('admin'));

      await test.step('AND web is focused', async (): Promise<void> => graphList.focusOn('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphControls.toggle());

      await test.step('AND the panel is expanded', async (): Promise<void> => graphControls.toggle());

      const carried = await test.step('AND the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the edited graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_EDITED_STUB));

      await test.step('THEN admin stays hidden, docs is dropped and web stays focused', async (): Promise<void> =>
        graphLook.expectControlsFields({ ...DEFAULT_CONTROLS, hidden: ['admin'], focus: 'web' }));

      await test.step('AND the camera is a fresh fit, not the saved one', async (): Promise<void> => graphLook.expectViewNot(carried));

      await test.step('WHEN the panel is collapsed', async (): Promise<void> => graphControls.toggle());

      await test.step('AND the panel is expanded', async (): Promise<void> => graphControls.toggle());

      await test.step('AND the controls graph is sent again', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the docs row is checked, so docs was not saved as hidden', async (): Promise<void> =>
        graphList.expectRowChecked('docs', true));
    }
  );

  test(
    'GIVEN a row unchecked and an edited graph sent at once, the new graph is built with that row still unchecked',
    { annotation: RF3 },
    async ({ graphCamera, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('AND the edited graph is sent with no wait', async (): Promise<void> =>
        graphHost.sendState(CONTROLS_EDITED_STUB));

      await test.step('THEN the web row is unchecked', async (): Promise<void> => graphList.expectRowChecked('web', false));

      await test.step('AND every edited package but web is visible', async (): Promise<void> =>
        graphCamera.expectVisible(EDITED_BUT_WEB));
    }
  );

  test(
    'GIVEN saved filters naming Object members, or a focus saved as hidden, they restore as plain names and the focus is unhidden',
    { annotation: RF4 },
    async ({ graphHost, graphList, graphLook, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with filters named __proto__ and constructor', async (): Promise<void> =>
        graphPage.open({ savedState: PROTO_SAVED }));

      await test.step('AND the proto graph is sent', async (): Promise<void> => graphHost.sendState(PROTO_CONTROLS_STUB));

      await test.step('THEN the __proto__ row is unchecked', async (): Promise<void> =>
        graphList.expectRowChecked('__proto__', false));

      await test.step('AND the constructor row is locked', async (): Promise<void> => graphList.expectRowLocked('constructor'));

      await test.step('AND nothing is selected, as __proto__ is not visible', async (): Promise<void> =>
        graphProbe.expectSelected(null));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());

      await test.step('WHEN the page is opened with ui saved as both hidden and focused', async (): Promise<void> =>
        graphPage.open({ savedState: FOCUS_IN_HIDDEN_SAVED }));

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the ui row is locked', async (): Promise<void> => graphList.expectRowLocked('ui'));

      await test.step('AND nothing is hidden', async (): Promise<void> =>
        graphLook.expectControlsFields({ ...DEFAULT_CONTROLS, focus: 'ui' }));

      await test.step('WHEN ui is focused again, which clears the focus', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('THEN the ui row is shown and nothing is hidden or focused', async (): Promise<void> =>
        graphLook.expectControlsFields(DEFAULT_CONTROLS));
    }
  );

  test(
    'GIVEN a saved view whose controls fields have the wrong types, the camera is restored and the controls start at their defaults',
    { annotation: AC4 },
    async ({ graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened with a view whose controls fields are malformed', async (): Promise<void> =>
        graphPage.open({ savedState: BAD_FIELDS_SAVED }));

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the saved camera is shown', async (): Promise<void> => graphLook.expectView(BAD_FIELDS_RESTORED));

      await test.step('AND the controls are the defaults', async (): Promise<void> =>
        graphLook.expectControlsFields(DEFAULT_CONTROLS));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );
});
