import { test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { WEB_TO_CORE_FACTS_STUB } from './test/stubs/graph-trace-facts.stub.ts';
import { packageInspection, pickingInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const RF3 = { description: 'M4-3 Review Focus 3', type: 'requirement' };

const FOCUSED_UI = ['ui', 'core', 'web', 'admin'];

test.describe('FEATURE: graph trace by keyboard', () => {
  test(
    'GIVEN web selected by keyboard, Enter on Start trace moves focus to the picking heading and Escape back to web',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Start trace', async (): Promise<void> => graphKeys.tabTo('Start trace'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('AND focus is on the picking heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the heading reads Trace from web', async (): Promise<void> => graphDetails.expectHeading('Trace from web'));

      await test.step('WHEN Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND focus is on the web heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the heading reads web', async (): Promise<void> => graphDetails.expectHeading('web'));
    }
  );

  test(
    'GIVEN a trace being picked by keyboard, Enter on a list name makes the trace and Clear trace goes back to web',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Start trace', async (): Promise<void> => graphKeys.tabTo('Start trace'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Shift+Tab returns to the list at web', async (): Promise<void> => graphKeys.shiftTabTo('web'));

      await test.step('AND Down is pressed to the core name', async (): Promise<void> => graphKeys.arrowTo('core'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the trace runs from web to core', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('AND the trace view lists web, data and core', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_CORE_FACTS_STUB));

      await test.step('WHEN Tab reaches Clear trace', async (): Promise<void> => graphKeys.tabTo('Clear trace'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND focus is on a heading', async (): Promise<void> => graphKeys.expectFocusedRole('heading'));
    }
  );

  test(
    'GIVEN a trace being picked by keyboard, Enter in the controls search makes a trace to the match',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Start trace', async (): Promise<void> => graphKeys.tabTo('Start trace'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Shift+Tab reaches Search packages', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND core is typed', async (): Promise<void> => graphKeys.type('core'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the trace runs from web to core', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));
    }
  );

  test(
    'GIVEN a trace being picked by keyboard, Focus in the list narrows the candidates and Enter on a name still picks',
    { annotation: RF3 },
    async ({ graphCamera, graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Start trace', async (): Promise<void> => graphKeys.tabTo('Start trace'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Shift+Tab returns to the list at web', async (): Promise<void> => graphKeys.shiftTabTo('web'));

      await test.step('AND Down is pressed to the ui name', async (): Promise<void> => graphKeys.arrowTo('ui'));

      await test.step('AND Right is pressed to Focus ui', async (): Promise<void> => graphPage.pressKey('ArrowRight'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN web is still being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('AND the focus filter is applied', async (): Promise<void> => graphCamera.expectVisible(FOCUSED_UI));

      await test.step('WHEN Left is pressed back to the ui name', async (): Promise<void> => graphPage.pressKey('ArrowLeft'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the trace runs from web to ui', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'ui')));
    }
  );

  test(
    'GIVEN web selected by keyboard, Escape on the graph clears it and Clear selection clears what a search selected',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches the graph', async (): Promise<void> => graphKeys.tabTo('Package graph'));

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('WHEN Shift+Tab reaches Search packages', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND web is typed', async (): Promise<void> => graphKeys.type('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN Shift+Tab reaches Clear selection', async (): Promise<void> => graphKeys.shiftTabTo('Clear selection'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND Clear selection is disabled', async (): Promise<void> => graphPage.expectDisabled('Clear selection'));
    }
  );

  test(
    'GIVEN a trace being picked by keyboard, typing in the filter and Enter on the first candidate makes the trace',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Start trace', async (): Promise<void> => graphKeys.tabTo('Start trace'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Filter packages', async (): Promise<void> => graphKeys.tabTo('Filter packages'));

      await test.step('AND co is typed', async (): Promise<void> => graphKeys.type('co'));

      await test.step('AND Tab moves to the core candidate', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the trace runs from web to core', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('AND focus is on a heading', async (): Promise<void> => graphKeys.expectFocusedRole('heading'));
    }
  );
});
