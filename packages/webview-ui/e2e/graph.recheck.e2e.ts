import { test } from './graph.fixture.ts';
import { PROTO_DETAILS_STUB } from './test/stubs/graph-details-edge.stub.ts';
import { DETAILS_NAMES_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import {
  PROTO_TO_PLAIN_FACTS_STUB,
  PROTO_TO_PLAIN_HIDDEN_FACTS_STUB,
  WEB_TO_CORE_FACTS_STUB,
  WEB_TO_CORE_HIDDEN_FACTS_STUB
} from './test/stubs/graph-trace-facts.stub.ts';
import {
  NONE_INSPECTION,
  linkInspection,
  packageInspection,
  pickingInspection,
  traceInspection
} from './test/utils/graph-inspection.spec.util.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const RF2 = { description: 'M4-3 Review Focus 2', type: 'requirement' };

const RF5 = { description: 'M4-3 Review Focus 5', type: 'requirement' };

const WITHOUT_DATA = DETAILS_NAMES_STUB.filter((name): boolean => name !== 'data');

test.describe('FEATURE: graph inspection re-check on a filter change', () => {
  test(
    'GIVEN a package inspected, unticking another keeps it and unticking it empties the panel',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND data is unticked in the list', async (): Promise<void> => graphList.toggleRow('data'));

      await test.step('THEN web is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN web is unticked in the list', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND focus stays on the web checkbox', async (): Promise<void> => graphKeys.expectFocusedName('Show web'));
    }
  );

  test(
    'GIVEN a link inspected, unticking an unrelated package keeps it and unticking an end empties the panel',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphLink, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND admin is unticked in the list', async (): Promise<void> => graphList.toggleRow('admin'));

      await test.step('THEN the web to ui link is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      await test.step('WHEN ui is unticked in the list', async (): Promise<void> => graphList.toggleRow('ui'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND focus stays on the ui checkbox', async (): Promise<void> => graphKeys.expectFocusedName('Show ui'));
    }
  );

  test(
    'GIVEN a trace being picked, unticking another package keeps picking and unticking the start empties the panel',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND admin is unticked in the list', async (): Promise<void> => graphList.toggleRow('admin'));

      await test.step('THEN web is still being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('WHEN web is unticked in the list', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND focus stays on the web checkbox', async (): Promise<void> => graphKeys.expectFocusedName('Show web'));
    }
  );

  test(
    'GIVEN a trace through data, unticking data keeps the trace as a ghost and ticking it brings it back in place',
    { annotation: RF2 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND data is unticked in the list', async (): Promise<void> => graphList.toggleRow('data'));

      await test.step('THEN the trace still runs from web to core', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('AND the trace view marks data hidden', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_CORE_HIDDEN_FACTS_STUB));

      await test.step('AND every package but data is visible', async (): Promise<void> => graphCamera.expectVisible(WITHOUT_DATA));

      await test.step('AND data is a ghost', async (): Promise<void> => graphTrace.expectGhost('data'));

      await test.step('WHEN data is ticked in the list', async (): Promise<void> => graphList.toggleRow('data'));

      await test.step('THEN the trace view hides nothing', async (): Promise<void> => graphTrace.expectTrace(WEB_TO_CORE_FACTS_STUB));

      await test.step('AND no ghost is left', async (): Promise<void> => graphTrace.expectNoGhost());

      await test.step('AND focus stays on the data checkbox', async (): Promise<void> => graphKeys.expectFocusedName('Show data'));
    }
  );

  test(
    'GIVEN a trace, unticking its end shows the start package and drops the ghost',
    { annotation: RF2 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND core is unticked in the list', async (): Promise<void> => graphList.toggleRow('core'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is headed web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND no ghost is left', async (): Promise<void> => graphTrace.expectNoGhost());

      await test.step('AND focus stays on the core checkbox', async (): Promise<void> => graphKeys.expectFocusedName('Show core'));
    }
  );

  test(
    'GIVEN a trace, unticking its start empties the panel',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND web is unticked in the list', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND focus stays on the web checkbox', async (): Promise<void> => graphKeys.expectFocusedName('Show web'));
    }
  );

  test(
    'GIVEN packages named like Object members, a trace through constructor survives unticking and ticking it',
    { annotation: RF5 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the proto graph is sent', async (): Promise<void> => graphHost.sendState(PROTO_DETAILS_STUB));

      await test.step('AND __proto__ is tapped', async (): Promise<void> => graphCanvas.tapNode('__proto__'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND plain is picked in the list', async (): Promise<void> => graphList.pick('plain'));

      await test.step('THEN the trace view lists the three packages', async (): Promise<void> =>
        graphTrace.expectTrace(PROTO_TO_PLAIN_FACTS_STUB));

      await test.step('WHEN constructor is unticked in the list', async (): Promise<void> => graphList.toggleRow('constructor'));

      await test.step('THEN the trace view marks constructor hidden', async (): Promise<void> =>
        graphTrace.expectTrace(PROTO_TO_PLAIN_HIDDEN_FACTS_STUB));

      await test.step('WHEN constructor is ticked in the list', async (): Promise<void> => graphList.toggleRow('constructor'));

      await test.step('THEN the trace view hides nothing', async (): Promise<void> =>
        graphTrace.expectTrace(PROTO_TO_PLAIN_FACTS_STUB));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );
});
