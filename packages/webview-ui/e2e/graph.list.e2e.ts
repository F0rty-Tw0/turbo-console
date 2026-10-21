import type { Camera } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const ALL = stateNamesOf(CONTROLS_CACHED_STUB);

const LISTED = ['docs', 'admin', 'web', 'base', 'config', 'core', 'data', 'ui'];

const CORE_AT_1 = ['core', 'config', 'data', 'ui'];

test.describe('FEATURE: graph package list', () => {
  test(
    'GIVEN the controls graph, searching narrows the list by name or path without touching the graph',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND APPS is searched', async (): Promise<void> => graphControls.search('APPS'));

      await test.step('THEN only the apps group is listed', async (): Promise<void> => graphList.expectGroups(['apps (2)']));

      await test.step('WHEN web is searched', async (): Promise<void> => graphControls.search('web'));

      await test.step('THEN only the web row is listed', async (): Promise<void> => graphList.expectRowsListed(['web']));

      await test.step('AND every package is visible', async (): Promise<void> => graphCamera.expectVisible(ALL));

      await test.step('AND the count reads 8 of 8', async (): Promise<void> => graphControls.expectCount(8, 8));

      await test.step('WHEN the search is cleared', async (): Promise<void> => graphControls.search(''));

      await test.step('THEN all eight rows are listed in order', async (): Promise<void> => graphList.expectRowsListed(LISTED));
    }
  );

  test(
    'GIVEN web unchecked and a search that leaves it out, a group toggle still reaches web',
    { annotation: AC1 },
    async ({ graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('AND admin is searched', async (): Promise<void> => graphControls.search('admin'));

      await test.step('AND the apps group is activated', async (): Promise<void> => graphList.toggleGroup('apps (2)'));

      await test.step('AND the search is cleared', async (): Promise<void> => graphControls.search(''));

      await test.step('THEN the web row is checked', async (): Promise<void> => graphList.expectRowChecked('web', true));

      await test.step('AND the admin row is checked', async (): Promise<void> => graphList.expectRowChecked('admin', true));
    }
  );

  test(
    'GIVEN a package tapped on the canvas, its row is marked current until the background is tapped',
    { annotation: AC1 },
    async ({ graphCanvas, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN the core row is current', async (): Promise<void> => graphList.expectRowCurrent('core'));

      await test.step('WHEN the background is tapped', async (): Promise<void> => graphCanvas.tapBackground());

      await test.step('THEN no row is current', async (): Promise<void> => graphList.expectNoRowCurrent());
    }
  );

  test(
    'GIVEN a zoomed-out graph, picking a package selects it, centres it and keeps the zoom',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the graph is zoomed out', async (): Promise<void> => graphCanvas.zoomBy(1000));

      const before = await test.step('AND the camera is noted', async (): Promise<Camera> => graphCamera.camera());

      await test.step('WHEN the core name button is pressed', async (): Promise<void> => graphList.pick('core'));

      await test.step('THEN core is selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('AND core is at the container centre', async (): Promise<void> => graphCamera.expectCentred('core'));

      await test.step('AND the zoom is as before', async (): Promise<void> => graphCamera.expectZoom(before.zoom));
    }
  );

  test(
    'GIVEN packages outside the visible set, their name buttons are disabled and select nothing',
    { annotation: AC1 },
    async ({ graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is unchecked', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('AND the web name button is pressed', async (): Promise<void> => graphList.pick('web'));

      await test.step('THEN the web name button is disabled', async (): Promise<void> => graphList.expectPickDisabled('web'));

      await test.step('AND nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('WHEN ui is focused', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('AND the docs name button is pressed', async (): Promise<void> => graphList.pick('docs'));

      await test.step('THEN the docs row is dimmed', async (): Promise<void> => graphList.expectRowDimmed('docs'));

      await test.step('AND the docs name button is disabled', async (): Promise<void> => graphList.expectPickDisabled('docs'));

      await test.step('AND ui is still selected', async (): Promise<void> => graphProbe.expectSelected('ui'));
    }
  );

  test(
    'GIVEN core focused, an invalid depth changes nothing and blur restores the last valid one',
    { annotation: AC1 },
    async ({ graphCamera, graphControls, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND core is focused', async (): Promise<void> => graphList.focusOn('core'));

      await test.step('AND the depth 6 is typed', async (): Promise<void> => graphControls.setDepth('6'));

      await test.step('THEN the depth 1 neighbourhood is visible', async (): Promise<void> => graphCamera.expectVisible(CORE_AT_1));

      await test.step('WHEN the depth is emptied', async (): Promise<void> => graphControls.setDepth(''));

      await test.step('THEN the depth 1 neighbourhood is visible', async (): Promise<void> => graphCamera.expectVisible(CORE_AT_1));

      await test.step('WHEN the depth 2.5 is typed', async (): Promise<void> => graphControls.setDepth('2.5'));

      await test.step('THEN the depth 1 neighbourhood is visible', async (): Promise<void> => graphCamera.expectVisible(CORE_AT_1));

      await test.step('WHEN the depth loses focus', async (): Promise<void> => graphControls.blurDepth());

      await test.step('THEN the depth shows 1', async (): Promise<void> => graphControls.expectDepthValue('1'));

      await test.step('WHEN the depth 3 is typed', async (): Promise<void> => graphControls.setDepth('3'));

      await test.step('AND the depth loses focus', async (): Promise<void> => graphControls.blurDepth());

      await test.step('THEN the depth shows 3', async (): Promise<void> => graphControls.expectDepthValue('3'));
    }
  );
});
