import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { DETAILS_NAMES_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { FOUND_DATA_STUB } from './test/stubs/graph-explain.stub.ts';
import { tabStopsOf } from './test/utils/graph-focus-steps.spec.util.ts';
import { linkInspection, packageInspection } from './test/utils/graph-inspection.spec.util.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const FOCUSED_WEB = ['web', 'data', 'ui', 'docs'];

const NEIGHBOUR_STOPS: FocusStep[] = tabStopsOf(['data', 'Explain web → data', 'ui']);

test.describe('FEATURE: graph details panel by keyboard', () => {
  test(
    'GIVEN web selected by keyboard, Enter on View Package Details posts openDetails for web',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN Tab reaches View Package Details', async (): Promise<void> =>
        graphKeys.tabTo('View Package Details · 5 tasks'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host got openDetails for web', async (): Promise<void> => graphHost.expectOpenDetails('web'));
    }
  );

  test(
    'GIVEN web selected by keyboard, Enter and Space on Focus and Exclude focus, unfocus and exclude it',
    { annotation: AC1 },
    async ({ graphCamera, graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN Tab reaches Focus', async (): Promise<void> => graphKeys.tabTo('Focus'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web and its neighbours are visible', async (): Promise<void> => graphCamera.expectVisible(FOCUSED_WEB));

      await test.step('AND focus is on Clear focus', async (): Promise<void> => graphKeys.expectFocusedName('Clear focus'));

      await test.step('WHEN Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN every package is visible', async (): Promise<void> => graphCamera.expectVisible(DETAILS_NAMES_STUB));

      await test.step('AND focus is on Focus', async (): Promise<void> => graphKeys.expectFocusedName('Focus'));

      await test.step('WHEN Tab reaches Exclude', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND focus is on the Details heading', async (): Promise<void> => graphKeys.expectFocusedRole('heading'));

      await test.step('AND the heading is named Details', async (): Promise<void> => graphKeys.expectFocusedName('Details'));
    }
  );

  test(
    'GIVEN web selected by keyboard, Enter on Explain inspects the link, and Enter on Open at line posts the line',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN Tab reaches Explain web to data', async (): Promise<void> => graphKeys.tabTo('Explain web → data'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the web to data link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'data')));

      await test.step('AND focus is on the link heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'data', 1));

      await test.step('WHEN the host answers with the data entry', async (): Promise<void> =>
        graphReplies.answerExplain(FOUND_DATA_STUB));

      await test.step('AND Tab reaches Open at line', async (): Promise<void> =>
        graphKeys.tabTo('Open package.json at line 7 (dependencies: data)'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host got openManifest for web at line 6', async (): Promise<void> =>
        graphReplies.expectOpenManifestPosted([{ type: 'openManifest', packageName: 'web', line: 6 }]));

      await test.step('AND the link is still shown', async (): Promise<void> => graphLink.expectLink('web', 'data'));
    }
  );

  test(
    'GIVEN web selected by keyboard, Tab walks the neighbours and Enter on one inspects it, centres it and focuses its heading',
    { annotation: AC1 },
    async ({ graphCamera, graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN Tab reaches Start trace', async (): Promise<void> => graphKeys.tabTo('Start trace'));

      const walked = await test.step('AND Tab is pressed three times', async (): Promise<FocusStep[]> =>
        graphKeys.walk(NEIGHBOUR_STOPS));

      await test.step('THEN focus went to data, its Explain button and ui', (): void => expect(walked).toEqual(NEIGHBOUR_STOPS));

      await test.step('WHEN Enter is pressed on ui', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN ui is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('ui')));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphKeys.expectFocusedRole('heading'));

      await test.step('AND the heading is named ui', async (): Promise<void> => graphKeys.expectFocusedName('ui'));

      await test.step('AND ui is centred', async (): Promise<void> => graphCamera.expectCentred('ui'));
    }
  );

  test(
    'GIVEN a link inspected by keyboard, Escape in the panel does not clear it',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Explain web to data', async (): Promise<void> => graphKeys.tabTo('Explain web → data'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND the host answers with the data entry', async (): Promise<void> =>
        graphReplies.answerExplain(FOUND_DATA_STUB));

      await test.step('THEN the web to data link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'data')));

      await test.step('WHEN Tab reaches the web end', async (): Promise<void> => graphKeys.tabTo('web'));

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN the web to data link is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'data')));

      await test.step('AND focus is still on web', async (): Promise<void> => graphKeys.expectFocusedName('web'));
    }
  );

  test(
    'GIVEN the details panel open, Space on the Details toggle closes it and Space again opens it',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('AND Tab reaches Details', async (): Promise<void> => graphKeys.tabTo('Details'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN the panel is closed', async (): Promise<void> => graphDetails.expectOpen(false));

      await test.step('AND the toggle is collapsed', async (): Promise<void> => graphDetails.expectExpanded(false));

      await test.step('AND focus is on Details', async (): Promise<void> => graphKeys.expectFocusedName('Details'));

      await test.step('WHEN Space is pressed again', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN the panel is open', async (): Promise<void> => graphDetails.expectOpen(true));

      await test.step('AND the toggle is expanded', async (): Promise<void> => graphDetails.expectExpanded(true));
    }
  );
});
