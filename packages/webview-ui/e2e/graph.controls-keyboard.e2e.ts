import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';

const AC1 = { description: 'M4-2 AC1', type: 'requirement' };

const RF1 = { description: 'M4-2 Review Focus 1', type: 'requirement' };

const DOWN_THREE: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowDown', focus: 'apps (2)' },
  { key: 'ArrowDown', focus: 'admin' }
];

const END_TO_DATA: FocusStep[] = [
  { key: 'End', focus: 'ui' },
  { key: 'ArrowUp', focus: 'data' }
];

const VERTICAL_WALK: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowDown', focus: 'apps (2)' },
  { key: 'ArrowDown', focus: 'admin' },
  { key: 'ArrowUp', focus: 'apps (2)' },
  { key: 'Home', focus: '(root) (1)' },
  { key: 'End', focus: 'ui' },
  { key: 'ArrowDown', focus: 'ui' },
  { key: 'Home', focus: '(root) (1)' },
  { key: 'ArrowUp', focus: '(root) (1)' }
];

const GRID_WALK: FocusStep[] = [
  ...DOWN_THREE,
  { key: 'ArrowRight', focus: 'Focus admin' },
  { key: 'ArrowRight', focus: 'Focus admin' },
  { key: 'ArrowLeft', focus: 'admin' },
  { key: 'ArrowLeft', focus: 'Show admin' },
  { key: 'ArrowLeft', focus: 'Show admin' },
  { key: 'ArrowUp', focus: 'apps (2)' },
  { key: 'ArrowRight', focus: 'apps (2)' },
  { key: 'ArrowDown', focus: 'Show admin' },
  { key: 'ArrowDown', focus: 'Show web' },
  { key: 'ArrowRight', focus: 'web' },
  { key: 'ArrowRight', focus: 'Focus web' },
  { key: 'ArrowDown', focus: 'packages (5)' },
  { key: 'ArrowDown', focus: 'Focus base' }
];

/** Show all is hidden while nothing is filtered, so the last tag's next Tab stop is the list. */
const TAB_TO_TAGS: FocusStep[] = [
  { key: 'Tab', focus: 'Focus depth' },
  { key: 'Tab', focus: 'Group by folder' },
  { key: 'Tab', focus: 'app' },
  { key: 'Tab', focus: 'lib' },
  { key: 'Tab', focus: 'ui' }
];

const TAB_PAST_DOCS_SEARCH: FocusStep[] = [...TAB_TO_TAGS, { key: 'Tab', focus: '(root) (1)' }];

const TAB_PAST_CORE_SEARCH: FocusStep[] = [...TAB_TO_TAGS, { key: 'Tab', focus: 'packages (5)' }];

test.describe('FEATURE: graph controls keyboard', () => {
  test(
    'GIVEN the controls graph, the package list is one Tab stop that lands on the first group checkbox',
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      await test.step('THEN the grid holds three headers and eight rows', async (): Promise<void> => graphList.expectGridShape(3, 8));

      await test.step('AND the list has one Tab stop', async (): Promise<void> => graphKeys.expectListTabStops(1));

      await test.step('AND the focused control is a checkbox', async (): Promise<void> => graphKeys.expectFocusedRole('checkbox'));
    }
  );

  test(
    'GIVEN the controls graph, Down, Up, Home and End walk the lines from the first group checkbox and stop at both ends',
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND Down, Up, Home and End are pressed in turn', async (): Promise<FocusStep[]> =>
        graphKeys.walk(VERTICAL_WALK));

      await test.step('THEN each key lands on its line and the ends hold', (): void => expect(walked).toEqual(VERTICAL_WALK));
    }
  );

  test(
    "GIVEN the controls graph, Left and Right walk a row's cells and Up and Down keep the remembered cell",
    { annotation: AC1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND the arrow keys are pressed in turn', async (): Promise<FocusStep[]> =>
        graphKeys.walk(GRID_WALK));

      await test.step('THEN each key lands on its cell, the row ends hold and headers have one cell', (): void =>
        expect(walked).toEqual(GRID_WALK));
    }
  );

  test(
    'GIVEN the controls graph, Tab enters the list at the first header checkbox once a search hides the remembered row and its group',
    { annotation: RF1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND Down is pressed three times', async (): Promise<FocusStep[]> => graphKeys.walk(DOWN_THREE));

      await test.step('THEN focus passes docs and apps (2) to the admin name', (): void => expect(walked).toEqual(DOWN_THREE));

      await test.step('WHEN focus goes back to the search', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND docs is typed', async (): Promise<void> => graphKeys.type('docs'));

      const tabbed = await test.step('AND Tab is pressed six times', async (): Promise<FocusStep[]> =>
        graphKeys.walk(TAB_PAST_DOCS_SEARCH));

      await test.step('THEN Tab walks depth, Group by folder and the tags, then enters the list at the first header checkbox', (): void =>
        expect(tabbed).toEqual(TAB_PAST_DOCS_SEARCH));
    }
  );

  test(
    'GIVEN the controls graph, Tab enters the list at the first header checkbox once a search hides the remembered row but keeps its group',
    { annotation: RF1 },
    async ({ graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the first group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND End and Up are pressed', async (): Promise<FocusStep[]> => graphKeys.walk(END_TO_DATA));

      await test.step('THEN focus reaches the data name', (): void => expect(walked).toEqual(END_TO_DATA));

      await test.step('WHEN focus goes back to the search', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND core is typed', async (): Promise<void> => graphKeys.type('core'));

      const tabbed = await test.step('AND Tab is pressed six times', async (): Promise<FocusStep[]> =>
        graphKeys.walk(TAB_PAST_CORE_SEARCH));

      await test.step('THEN Tab walks depth, Group by folder and the tags, then enters the list at the packages header checkbox', (): void =>
        expect(tabbed).toEqual(TAB_PAST_CORE_SEARCH));
    }
  );
});
