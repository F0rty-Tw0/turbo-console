import { test } from './graph.fixture.ts';
import { PROTO_DETAILS_STUB } from './test/stubs/graph-details-edge.stub.ts';
import { DETAILS_RECOUNT_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import {
  FOUND_DATA_STUB,
  FOUND_PROTO_STUB,
  FOUND_UI_CHANGED_STUB,
  FOUND_UI_STUB,
  MISSING_STUB,
  OPEN_PROTO_MANIFEST_STUB,
  OPEN_UI_MANIFEST_STUB,
  OPEN_WEB_TOP_STUB,
  ROOT_UNREADABLE_STUB,
  UI_CHANGED_ROWS_STUB,
  UI_ENTRIES_STUB
} from './test/stubs/graph-explain.stub.ts';
import { WEB_UI_EDGES_STUB, WEB_UI_NODES_STUB } from './test/stubs/graph-link-states.stub.ts';
import { linkInspection, packageInspection } from './test/utils/graph-inspection.spec.util.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const RF1 = { description: 'M4-3 RF1', type: 'requirement' };

const RF5 = { description: 'M4-3 RF5', type: 'requirement' };

test.describe('FEATURE: graph link explain', () => {
  test(
    'GIVEN the details graph, tapping a link inspects it, selects its edge and clears the package selection',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphLink, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      await test.step('AND the panel shows the link', async (): Promise<void> => graphLink.expectLink('web', 'ui'));

      await test.step('AND the status line says web depends on ui', async (): Promise<void> =>
        graphPage.expectStatus('web depends on ui'));

      await test.step('AND Clear selection is enabled', async (): Promise<void> => graphPage.expectEnabled('Clear selection'));

      await test.step('AND the two ends are highlighted, the rest dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(WEB_UI_NODES_STUB));

      await test.step('AND the link edge is selected, the rest dimmed', async (): Promise<void> =>
        graphProbe.expectEdgeStates(WEB_UI_EDGES_STUB));

      await test.step('AND no list row is current', async (): Promise<void> => graphList.expectNoRowCurrent());

      await test.step('AND no package is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test(
    'GIVEN a tapped package after a zoom and pan, tapping a link moves no camera',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphLink, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the ui to core link is tapped', async (): Promise<void> => graphLink.tapLink('ui', 'core'));

      await test.step('THEN the link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('ui', 'core')));

      await test.step('AND zoom and pan are as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('AND no package is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test(
    'GIVEN a tapped link, the reply lists each manifest entry and each Open at line posts its own line',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'ui', 1));

      await test.step('AND the panel reads apps/web/package.json', async (): Promise<void> =>
        graphLink.expectReading('apps/web/package.json'));

      await test.step('WHEN the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('THEN both entries are listed', async (): Promise<void> => graphLink.expectEntries(UI_ENTRIES_STUB));

      await test.step('AND no CSP violation was reported', async (): Promise<void> => graphPage.expectNoViolations());

      await test.step('WHEN the dependencies Open at line is pressed', async (): Promise<void> =>
        graphLink.pressOpen('dependencies', 'ui'));

      await test.step('AND the devDependencies Open at line is pressed', async (): Promise<void> =>
        graphLink.pressOpen('devDependencies', 'ui'));

      await test.step('THEN the host got one openManifest per entry line', async (): Promise<void> =>
        graphReplies.expectOpenManifestPosted(OPEN_UI_MANIFEST_STUB));
    }
  );

  test(
    'GIVEN a tapped link, a missing entry is explained and its Open package.json posts the top line',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers that no entry exists', async (): Promise<void> =>
        graphReplies.answerExplain(MISSING_STUB));

      await test.step('THEN the panel says web has no entry naming ui', async (): Promise<void> =>
        graphLink.expectMissing('apps/web/package.json', 'ui'));

      await test.step('WHEN Open package.json is pressed', async (): Promise<void> => graphLink.pressOpenMissing());

      await test.step('THEN the host got one openManifest for line 0', async (): Promise<void> =>
        graphReplies.expectOpenManifestPosted(OPEN_WEB_TOP_STUB));
    }
  );

  test(
    'GIVEN the root package as a link end, an unreadable manifest is explained with no Open button',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the docs to web link is tapped', async (): Promise<void> => graphLink.tapLink('docs', 'web'));

      await test.step('THEN the panel reads the root package.json', async (): Promise<void> =>
        graphLink.expectReading('package.json'));

      await test.step('WHEN the host answers that it could not read it', async (): Promise<void> =>
        graphReplies.answerExplain(ROOT_UNREADABLE_STUB));

      await test.step('THEN the panel says the root package.json is unreadable', async (): Promise<void> =>
        graphLink.expectUnreadable('package.json'));

      await test.step('AND there is no Open button', async (): Promise<void> => graphLink.expectNoOpenButton());

      await test.step('AND the host got no openManifest', async (): Promise<void> => graphReplies.expectNoOpenManifest());
    }
  );

  test(
    'GIVEN a tapped link, replies for other links and replies after the link was left change nothing',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphLink, graphList, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND a reply names the ends the wrong way round', async (): Promise<void> =>
        graphReplies.answerExplainFor('ui', 'web', FOUND_UI_STUB));

      await test.step('AND a reply names another target', async (): Promise<void> =>
        graphReplies.answerExplainFor('web', 'data', FOUND_DATA_STUB));

      await test.step('THEN the panel still reads the manifest', async (): Promise<void> =>
        graphLink.expectReading('apps/web/package.json'));

      await test.step('WHEN core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND the reply for the left link arrives late', async (): Promise<void> =>
        graphReplies.answerExplainFor('web', 'ui', FOUND_UI_STUB));

      await test.step('THEN the panel is headed core', async (): Promise<void> => graphDetails.expectHeading('core'));

      await test.step('AND core is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('core')));

      await test.step('AND there is no Open button', async (): Promise<void> => graphLink.expectNoOpenButton());

      await test.step('AND the late reply raised no page error', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN a focused Open at line, a same-hash state asks again and updates the entries in place keeping focus',
    { annotation: RF1 },
    async ({ graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('AND the dependencies Open at line is focused', async (): Promise<void> =>
        graphLink.focusOpen('dependencies', 'ui'));

      await test.step('AND the same graph with new task counts is sent', async (): Promise<void> =>
        graphHost.sendState(DETAILS_RECOUNT_STUB));

      await test.step('THEN the host was asked to explain the link a second time', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'ui', 2));

      await test.step('AND both entries are still listed, not read again', async (): Promise<void> =>
        graphLink.expectEntries(UI_ENTRIES_STUB));

      await test.step('AND the same button still holds focus', async (): Promise<void> =>
        graphLink.expectOpenFocused('dependencies', 'ui'));

      await test.step('WHEN the host answers with a changed entry', async (): Promise<void> =>
        graphReplies.answerExplain(FOUND_UI_CHANGED_STUB));

      await test.step('THEN the changed excerpt is shown', async (): Promise<void> =>
        graphLink.expectExcerpt('dependencies', 'ui', UI_CHANGED_ROWS_STUB));

      await test.step('AND the same button still holds focus', async (): Promise<void> =>
        graphLink.expectOpenFocused('dependencies', 'ui'));
    }
  );

  test(
    'GIVEN a link left for a package, tapping the same link again asks the host again and reads afresh',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphList, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'ui', 1));

      await test.step('WHEN web is picked in the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('AND the web to ui link is tapped again', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the host was asked a second time', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'ui', 2));

      await test.step('AND the panel reads the manifest afresh', async (): Promise<void> =>
        graphLink.expectReading('apps/web/package.json'));
    }
  );

  test(
    'GIVEN packages named like Object members, a link between them is explained and opened by its own names',
    { annotation: RF5 },
    async ({ graphDetails, graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the Object-member graph is sent', async (): Promise<void> => graphHost.sendState(PROTO_DETAILS_STUB));

      await test.step('AND the __proto__ to constructor link is tapped', async (): Promise<void> =>
        graphLink.tapLink('__proto__', 'constructor'));

      await test.step('THEN the panel shows the link', async (): Promise<void> => graphLink.expectLink('__proto__', 'constructor'));

      await test.step('AND the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('__proto__', 'constructor', 1));

      await test.step('AND the status line says __proto__ depends on constructor', async (): Promise<void> =>
        graphPage.expectStatus('__proto__ depends on constructor'));

      await test.step('WHEN the host answers with its entry', async (): Promise<void> => graphReplies.answerExplain(FOUND_PROTO_STUB));

      await test.step('THEN the entry is listed', async (): Promise<void> => graphLink.expectEntries(FOUND_PROTO_STUB.entries));

      await test.step('WHEN its Open at line is pressed', async (): Promise<void> =>
        graphLink.pressOpen('dependencies', 'constructor'));

      await test.step('THEN the host got one openManifest for __proto__ at line 4', async (): Promise<void> =>
        graphReplies.expectOpenManifestPosted(OPEN_PROTO_MANIFEST_STUB));

      await test.step('AND the link is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('__proto__', 'constructor')));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );
});
