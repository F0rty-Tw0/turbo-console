import type { PackageFacts, WidthChange } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { DETAILS_RECOUNT_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { packageInspection } from './test/utils/graph-inspection.spec.util.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const RF1 = { description: 'M4-3 RF1', type: 'requirement' };

const RF2 = { description: 'M4-3 RF2', type: 'requirement' };

const CORE_STATUS = 'core · 2 dependencies, 1 direct · 5 dependents, 2 direct';

const WEB_STATUS = 'web · 5 dependencies, 2 direct · 1 dependent, 1 direct';

const UI_STATUS = 'ui · 3 dependencies, 1 direct · 3 dependents, 2 direct';

const SOLO_STATUS = 'solo · 0 dependencies, 0 direct · 0 dependents, 0 direct';

const CONFIG_STATUS = 'config · 1 dependency, 1 direct · 6 dependents, 1 direct';

const CORE_FACTS: PackageFacts = { path: 'packages/core', tags: ['lib'], button: 'View Package Details · 4 tasks' };

const WEB_FACTS: PackageFacts = { path: 'apps/web', tags: ['app', 'ui'], button: 'View Package Details · 5 tasks' };

const DOCS_FACTS: PackageFacts = { path: '(root)', tags: [], button: 'View Package Details · 0 tasks' };

const UI_FACTS: PackageFacts = { path: 'packages/ui', tags: ['ui'], button: 'View Package Details · 1 task' };

const UI_RECOUNT_FACTS: PackageFacts = { path: 'packages/ui', tags: ['ui'], button: 'View Package Details · 2 tasks' };

test.describe('FEATURE: graph details panel', () => {
  test(
    'GIVEN no host state, the Details button is disabled and the panel is hidden',
    { annotation: AC1 },
    async ({ graphDetails, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened without a host', async (): Promise<void> => graphPage.open({ host: false }));

      await test.step('THEN the page is in its pre-state', async (): Promise<void> => graphPage.expectPreState());

      await test.step('AND Details is disabled', async (): Promise<void> => graphPage.expectDisabled('Details'));

      await test.step('AND the panel is hidden', async (): Promise<void> => graphDetails.expectOpen(false));
    }
  );

  test(
    'GIVEN the details graph, the panel opens empty with nothing inspected under the CSP',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the panel is open', async (): Promise<void> => graphDetails.expectOpen(true));

      await test.step('AND the button reads expanded', async (): Promise<void> => graphDetails.expectExpanded(true));

      await test.step('AND the panel shows the empty view', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND Clear selection is disabled', async (): Promise<void> => graphPage.expectDisabled('Clear selection'));

      await test.step('AND no CSP violation was reported', async (): Promise<void> => graphPage.expectNoViolations());

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN the details graph, collapsing the panel after a zoom and pan resizes the canvas at once and moves no camera',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      const width = await test.step('AND the Details button is pressed', async (): Promise<WidthChange> =>
        graphDetails.toggleDetailsInOneTask());

      await test.step('THEN the panel is hidden', async (): Promise<void> => graphDetails.expectOpen(false));

      await test.step('AND the button reads collapsed', async (): Promise<void> => graphDetails.expectExpanded(false));

      await test.step('AND the canvas grew in the task of the click', (): void => expect(width.after).toBeGreaterThan(width.before));

      await test.step('AND zoom and pan are as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('WHEN the Details button is pressed again', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the panel is open', async (): Promise<void> => graphDetails.expectOpen(true));

      await test.step('AND the canvas is as wide as before', async (): Promise<void> =>
        graphCamera.expectContainerWidth(width.before));

      await test.step('AND zoom and pan are still as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a collapsed panel, a tapped package is inspected and its facts show once the panel opens',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphDetails.toggle());

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN core is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('core')));

      await test.step('AND the status line counts its closure', async (): Promise<void> => graphPage.expectStatus(CORE_STATUS));

      await test.step('WHEN the panel is opened', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the panel is headed core', async (): Promise<void> => graphDetails.expectHeading('core'));

      await test.step('AND it shows the facts of core', async (): Promise<void> => graphDetails.expectFacts(CORE_FACTS));
    }
  );

  test(
    'GIVEN the details graph, tapping web shows its facts, status and current row',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('THEN the panel is headed web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND it shows the facts of web', async (): Promise<void> => graphDetails.expectFacts(WEB_FACTS));

      await test.step('AND the status line counts its closure', async (): Promise<void> => graphPage.expectStatus(WEB_STATUS));

      await test.step('AND web is the selected package', async (): Promise<void> => graphProbe.expectSelected('web'));

      await test.step('AND web is the current row', async (): Promise<void> => graphList.expectRowCurrent('web'));
    }
  );

  test(
    'GIVEN the details graph, picking the root package shows (root) and no tags, and the singular task count',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND docs is picked in the list', async (): Promise<void> => graphList.pick('docs'));

      await test.step('THEN the facts show (root), no tags and 0 tasks', async (): Promise<void> =>
        graphDetails.expectFacts(DOCS_FACTS));

      await test.step('WHEN ui is picked in the list', async (): Promise<void> => graphList.pick('ui'));

      await test.step('THEN the facts show its path, its tag and 1 task', async (): Promise<void> =>
        graphDetails.expectFacts(UI_FACTS));
    }
  );

  test(
    'GIVEN the details graph, each picked package lists its direct neighbours and its status counts equal the lists',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND ui is picked in the list', async (): Promise<void> => graphList.pick('ui'));

      await test.step('THEN the status line counts ui', async (): Promise<void> => graphPage.expectStatus(UI_STATUS));

      await test.step('AND its dependencies are core', async (): Promise<void> =>
        graphDetails.expectNeighbours('Direct dependencies', ['core']));

      await test.step('AND its dependents are admin and web, in that order', async (): Promise<void> =>
        graphDetails.expectNeighbours('Direct dependents', ['admin', 'web']));

      await test.step('WHEN web is picked in the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('THEN the status line counts web', async (): Promise<void> => graphPage.expectStatus(WEB_STATUS));

      await test.step('AND its dependencies are data and ui', async (): Promise<void> =>
        graphDetails.expectNeighbours('Direct dependencies', ['data', 'ui']));

      await test.step('AND its dependent is docs', async (): Promise<void> =>
        graphDetails.expectNeighbours('Direct dependents', ['docs']));

      await test.step('WHEN solo is picked in the list', async (): Promise<void> => graphList.pick('solo'));

      await test.step('THEN the status line counts solo', async (): Promise<void> => graphPage.expectStatus(SOLO_STATUS));

      await test.step('AND it has no dependencies', async (): Promise<void> => graphDetails.expectNoNeighbours('Direct dependencies'));

      await test.step('AND it has no dependents', async (): Promise<void> => graphDetails.expectNoNeighbours('Direct dependents'));

      await test.step('WHEN config is picked in the list', async (): Promise<void> => graphList.pick('config'));

      await test.step('THEN the status line counts config', async (): Promise<void> => graphPage.expectStatus(CONFIG_STATUS));

      await test.step('AND it has one direct dependency', async (): Promise<void> =>
        graphDetails.expectNeighbourCount('Direct dependencies', 1));

      await test.step('AND it has one direct dependent', async (): Promise<void> =>
        graphDetails.expectNeighbourCount('Direct dependents', 1));
    }
  );

  test(
    'GIVEN a tapped web, unticking data marks it hidden and makes its buttons inert until Show all',
    { annotation: RF2 },
    async ({ graphCanvas, graphControls, graphDetails, graphHost, graphList, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the data row is unchecked', async (): Promise<void> => graphList.toggleRow('data'));

      await test.step('THEN data reads hidden with inert buttons', async (): Promise<void> =>
        graphDetails.expectNeighbourHidden('data', true));

      await test.step('AND ui reads shown', async (): Promise<void> => graphDetails.expectNeighbourHidden('ui', false));

      await test.step('AND web is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN the hidden data name is pressed', async (): Promise<void> => graphDetails.pressNeighbour('data'));

      await test.step('AND its Explain is pressed', async (): Promise<void> => graphDetails.explain('web', 'data'));

      await test.step('THEN web is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the host was asked to explain nothing', async (): Promise<void> => graphReplies.expectNoExplainAsked());

      await test.step('WHEN Show all is pressed', async (): Promise<void> => graphControls.showAll());

      await test.step('THEN data reads shown with live buttons', async (): Promise<void> =>
        graphDetails.expectNeighbourHidden('data', false));
    }
  );

  test(
    'GIVEN a focused Package Details button, a task count change updates it in place and keeps focus',
    { annotation: RF1 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('AND the Package Details button is focused', async (): Promise<void> =>
        graphDetails.focusButton('View Package Details · 1 task'));

      await test.step('AND the same graph with new task counts is sent', async (): Promise<void> =>
        graphHost.sendState(DETAILS_RECOUNT_STUB));

      await test.step('THEN the button reads 2 tasks', async (): Promise<void> => graphDetails.expectFacts(UI_RECOUNT_FACTS));

      await test.step('AND the same button still holds focus', async (): Promise<void> =>
        graphKeys.expectFocusedName('View Package Details · 2 tasks'));

      await test.step('AND the host was asked to explain nothing', async (): Promise<void> => graphReplies.expectNoExplainAsked());
    }
  );
});
