import type { Camera } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB, CONTROLS_POSITIONS_STUB, PROTO_CONTROLS_STUB } from './test/stubs/graph-controls.stub.ts';
import { without } from './test/utils/graph-controls.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const AC3 = { description: 'M4-2 AC3', type: 'requirement' };

const RF4 = { description: 'M4-2 Review Focus 4', type: 'requirement' };

const ALL = stateNamesOf(CONTROLS_CACHED_STUB);

const LIB = ['base', 'config', 'core', 'data'];

test.describe('FEATURE: graph filters', () => {
  test(
    'GIVEN a package unchecked, it is hidden, untappable and no node moves',
    { annotation: AC3 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN web is not visible', async (): Promise<void> => graphCamera.expectVisible(without(ALL, ['web'])));

      await test.step('AND the count reads 7 of 8', async (): Promise<void> => graphControls.expectCount(7, 8));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.expectRowChecked('web', false));

      await test.step('AND every node keeps its position', async (): Promise<void> =>
        graphProbe.expectNodesAt(CONTROLS_POSITIONS_STUB));

      await test.step('AND a click on web selects nothing', async (): Promise<void> => graphCamera.expectUntappable('web'));

      await test.step('AND Show all is enabled', async (): Promise<void> => graphControls.expectShowAllDisabled(false));

      await test.step('AND no positions were posted', async (): Promise<void> => graphHost.expectNoPositionsPosted());
    }
  );

  test(
    'GIVEN a folder unchecked, its packages are hidden and the other group stays checked',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the apps group is unchecked', async (): Promise<void> => graphList.toggleGroup('apps (2)'));

      await test.step('THEN admin and web are not visible', async (): Promise<void> =>
        graphCamera.expectVisible(without(ALL, ['admin', 'web'])));

      await test.step('AND a click on admin selects nothing', async (): Promise<void> => graphCamera.expectUntappable('admin'));

      await test.step('AND the apps group is unchecked', async (): Promise<void> => graphList.expectGroupChecked('apps (2)', false));

      await test.step('AND the packages group is checked', async (): Promise<void> =>
        graphList.expectGroupChecked('packages (5)', true));
    }
  );

  test(
    'GIVEN a mixed group, activating it checks all its rows',
    { annotation: AC1 },
    async ({ graphCamera, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('AND the apps group reads mixed', async (): Promise<void> => graphList.expectGroupMixed('apps (2)'));

      await test.step('WHEN the apps group is activated', async (): Promise<void> => graphList.toggleGroup('apps (2)'));

      await test.step('THEN the apps group is checked', async (): Promise<void> => graphList.expectGroupChecked('apps (2)', true));

      await test.step('AND every package is visible', async (): Promise<void> => graphCamera.expectVisible(ALL));
    }
  );

  test(
    'GIVEN the lib tag checked, only lib packages are visible and the others are dimmed but checked',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the lib tag is checked', async (): Promise<void> => graphControls.toggleTag('lib'));

      await test.step('THEN only the lib packages are visible', async (): Promise<void> => graphCamera.expectVisible(LIB));

      await test.step('AND a click on web selects nothing', async (): Promise<void> => graphCamera.expectUntappable('web'));

      await test.step('AND the web row is dimmed', async (): Promise<void> => graphList.expectRowDimmed('web'));

      await test.step('AND its name is drawn at half opacity, not dimmed twice', async (): Promise<void> =>
        graphLook.expectNameOpacity('web', 0.5));

      await test.step('AND the web row is still checked', async (): Promise<void> => graphList.expectRowChecked('web', true));
    }
  );

  test(
    'GIVEN two tags checked, packages with either tag are visible',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the app tag is checked', async (): Promise<void> => graphControls.toggleTag('app'));

      await test.step('AND the ui tag is checked', async (): Promise<void> => graphControls.toggleTag('ui'));

      await test.step('THEN the packages with either tag are visible', async (): Promise<void> =>
        graphCamera.expectVisible(['web', 'admin', 'ui']));
    }
  );

  test(
    'GIVEN a selected package, unchecking its row drops the selection',
    { annotation: AC1 },
    async ({ graphCanvas, graphControls, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('AND the ui row is unchecked', async (): Promise<void> => graphList.toggleRow('ui'));

      await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('AND the count reads 7 of 8', async (): Promise<void> => graphControls.expectCount(7, 8));
    }
  );

  test(
    'GIVEN packages and tags named like Object members, filters treat them as plain names',
    { annotation: RF4 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the Object-member graph is sent', async (): Promise<void> => graphHost.sendState(PROTO_CONTROLS_STUB));

      await test.step('AND the __proto__ row is unchecked', async (): Promise<void> => graphList.toggleRow('__proto__'));

      await test.step('THEN the groups are listed', async (): Promise<void> => graphList.expectGroups(['apps (1)', 'packages (2)']));

      await test.step('AND the rows are listed in order', async (): Promise<void> =>
        graphList.expectRowsListed(['app', '__proto__', 'constructor']));

      await test.step('AND __proto__ is not visible', async (): Promise<void> => graphCamera.expectVisible(['app', 'constructor']));

      await test.step('WHEN the constructor tag is checked', async (): Promise<void> => graphControls.toggleTag('constructor'));

      await test.step('THEN only constructor is visible', async (): Promise<void> => graphCamera.expectVisible(['constructor']));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN every group unchecked, Fit is disabled until Show all',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the root group is unchecked', async (): Promise<void> => graphList.toggleGroup('(root) (1)'));

      await test.step('AND the apps group is unchecked', async (): Promise<void> => graphList.toggleGroup('apps (2)'));

      await test.step('AND the packages group is unchecked', async (): Promise<void> => graphList.toggleGroup('packages (5)'));

      await test.step('THEN the count reads 0 of 8', async (): Promise<void> => graphControls.expectCount(0, 8));

      await test.step('AND Fit is disabled', async (): Promise<void> => graphPage.expectDisabled('Fit'));

      await test.step('WHEN Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN Fit is enabled', async (): Promise<void> => graphPage.expectEnabled('Fit'));

      await test.step('AND the count reads 8 of 8', async (): Promise<void> => graphControls.expectCount(8, 8));
    }
  );

  test(
    'GIVEN a tag that already excludes web, unchecking web leaves the camera alone',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the lib tag is checked', async (): Promise<void> => graphControls.toggleTag('lib'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      const before = await test.step('AND the camera is noted', async (): Promise<Camera> => graphCamera.camera());

      await test.step('WHEN the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN zoom and pan are as before', async (): Promise<void> => graphCamera.expectCamera(before));

      await test.step('AND only the lib packages are visible', async (): Promise<void> => graphCamera.expectVisible(LIB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.expectRowChecked('web', false));
    }
  );
});
