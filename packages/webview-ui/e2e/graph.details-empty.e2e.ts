import { test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { linkInspection, packageInspection, pickingInspection } from './test/utils/graph-inspection.spec.util.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

test.describe('FEATURE: graph details empty guide', () => {
  test(
    'GIVEN the details graph, the empty panel lists the three ways in and the Esc line',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the guide names a package, a link and a path, each with its icon and copy, and the Esc line', async (): Promise<void> =>
        graphDetails.expectGuide());
    }
  );

  test(
    'GIVEN the details graph, Enter on a package name in Controls shows its facts and leaves focus on the list',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is headed web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND focus stays on the web name', async (): Promise<void> => graphKeys.expectFocusedName('web'));
    }
  );

  test(
    "GIVEN the details graph, Enter on a neighbour's Explain opens the link and moves focus to its heading",
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphLink, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN Tab reaches the Explain button of web and data', async (): Promise<void> =>
        graphKeys.tabTo('Explain web → data'));

      await test.step('AND Enter is pressed on it', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the web to data link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'data')));

      await test.step('AND the link view names both ends', async (): Promise<void> => graphLink.expectLink('web', 'data'));

      await test.step('AND focus moves to the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());
    }
  );

  test(
    'GIVEN the details graph, Enter on Start trace begins picking and moves focus to the heading',
    { annotation: AC1 },
    async ({ graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('AND Down is pressed to the web name', async (): Promise<void> => graphKeys.arrowTo('web'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN Tab reaches Start trace', async (): Promise<void> => graphKeys.tabTo('Start trace'));

      await test.step('AND Enter is pressed on it', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN a trace from web is being picked', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('AND focus moves to the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());
    }
  );
});
