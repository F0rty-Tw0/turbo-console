import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import {
  DIMMED_EDGES_STUB,
  FILTER_COR_NODES_STUB,
  FILTER_CO_NODES_STUB,
  PICKING_NODES_STUB,
  START_ONLY_NODES_STUB
} from './test/stubs/graph-trace-states.stub.ts';
import { packageInspection, pickingInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

test.describe('FEATURE: graph trace picking', () => {
  test(
    'GIVEN a selected package, Start trace lists the candidates, lights them on the canvas and hints at the end',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphDetailsBar, graphHost, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('THEN a trace from web is being picked', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('AND the picking view is shown', async (): Promise<void> => graphTrace.expectPicking('web'));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the status asks for the end package', async (): Promise<void> =>
        graphPage.expectStatus('Trace from web: select the end package'));

      await test.step('AND the dependencies of web are listed nearest first', async (): Promise<void> =>
        graphTrace.expectCandidates('forward', ['data', 'ui', 'core', 'config', 'base'], 5));

      await test.step('AND each of them says how many links away it is', async (): Promise<void> =>
        graphTrace.expectCandidateLinks('forward', [1, 1, 2, 3, 4]));

      await test.step('AND the dependents of web are listed', async (): Promise<void> =>
        graphTrace.expectCandidates('backward', ['docs'], 1));

      await test.step('AND the packages with no path are listed', async (): Promise<void> =>
        graphTrace.expectCandidates('none', ['admin', 'solo'], 2));

      await test.step('AND the candidates are lit and the rest dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(PICKING_NODES_STUB));

      await test.step('AND every edge is dimmed', async (): Promise<void> => graphProbe.expectEdgeStates(DIMMED_EDGES_STUB));

      await test.step('AND the probe reports no selected package', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('AND the Details bar shows Clear selection enabled', async (): Promise<void> =>
        graphDetailsBar.expectClearShown());

      await test.step('AND the canvas hint names the start', async (): Promise<void> =>
        graphTrace.expectHint('Pick the end of the trace from web'));
    }
  );

  test(
    'GIVEN a trace being picked, typing in the filter lights only the matching candidates and clearing it lights them all',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND co is typed in the filter', async (): Promise<void> => graphTrace.filterCandidates('co'));

      await test.step('THEN core and config are lit and the rest dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(FILTER_CO_NODES_STUB));

      await test.step('AND the forward group lists core and config out of five', async (): Promise<void> =>
        graphTrace.expectCandidates('forward', ['core', 'config'], 5));

      await test.step('AND the dependents read No match out of one', async (): Promise<void> =>
        graphTrace.expectCandidates('backward', [], 1));

      await test.step('AND the packages with no path read No match out of two', async (): Promise<void> =>
        graphTrace.expectCandidates('none', [], 2));

      await test.step('WHEN r is typed', async (): Promise<void> => graphTrace.filterCandidates('r'));

      await test.step('THEN only core is lit', async (): Promise<void> => graphProbe.expectNodeStates(FILTER_COR_NODES_STUB));

      await test.step('AND the forward group lists core out of five', async (): Promise<void> =>
        graphTrace.expectCandidates('forward', ['core'], 5));

      await test.step('WHEN the filter is cleared', async (): Promise<void> => graphTrace.clearFilter());

      await test.step('THEN the candidates are lit as before the filter', async (): Promise<void> =>
        graphProbe.expectNodeStates(PICKING_NODES_STUB));

      await test.step('AND every group lists all its candidates', async (): Promise<void> =>
        graphTrace.expectCandidates('forward', ['data', 'ui', 'core', 'config', 'base'], 5));

      await test.step('AND the dependents are listed again', async (): Promise<void> =>
        graphTrace.expectCandidates('backward', ['docs'], 1));

      await test.step('AND the packages with no path are listed again', async (): Promise<void> =>
        graphTrace.expectCandidates('none', ['admin', 'solo'], 2));
    }
  );

  test(
    'GIVEN a trace being picked, a filter naming a path matches the path as well as the name',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND apps is typed in the filter', async (): Promise<void> => graphTrace.filterCandidates('apps'));

      await test.step('THEN the forward group reads No match out of five', async (): Promise<void> =>
        graphTrace.expectCandidates('forward', [], 5));

      await test.step('AND the dependents read No match out of one', async (): Promise<void> =>
        graphTrace.expectCandidates('backward', [], 1));

      await test.step('AND the packages with no path list admin', async (): Promise<void> =>
        graphTrace.expectCandidates('none', ['admin'], 2));

      await test.step('AND nothing is lit but the start', async (): Promise<void> =>
        graphProbe.expectNodeStates(START_ONLY_NODES_STUB));

      await test.step('AND every edge is dimmed', async (): Promise<void> => graphProbe.expectEdgeStates(DIMMED_EDGES_STUB));
    }
  );

  test(
    'GIVEN a filtered picking, Enter picks the first match and picks nothing when nothing matches',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND co is typed in the filter', async (): Promise<void> => graphTrace.filterCandidates('co'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the trace runs from web to core, the first match', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('WHEN web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND zzz is typed in the filter', async (): Promise<void> => graphTrace.filterCandidates('zzz'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN web is still being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));
    }
  );

  test(
    'GIVEN a filter with text in it, Escape cancels the picking, shows the start and empties the box for the next one',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND co is typed in the filter', async (): Promise<void> => graphTrace.filterCandidates('co'));

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is headed web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('WHEN Start trace is pressed again', async (): Promise<void> => graphDetails.startTrace());

      await test.step('THEN the filter box is empty', async (): Promise<void> => graphTrace.expectFilterValue(''));

      await test.step('AND the candidates are lit as before any filter', async (): Promise<void> =>
        graphProbe.expectNodeStates(PICKING_NODES_STUB));
    }
  );
});
