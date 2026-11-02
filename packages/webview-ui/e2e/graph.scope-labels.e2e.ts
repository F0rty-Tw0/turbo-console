import { expect, test } from './graph-task.fixture.ts';
import { scopedNamesState } from './test/utils/graph-scope-names.spec.util.ts';
import type { ProbeNode } from '../src/graph/common/graph-probe.type.ts';

const SCOPE_LABELS = { description: 'U5 spec D7, §5 rows 11-14', type: 'requirement' };

const IDS = ['@org/app', '@org/lib', 'tool'];

const BARE_TEXTS = [
  ['@org/app', 'app'],
  ['@org/lib', 'lib'],
  ['tool', 'tool']
];

const FULL_TEXTS = [
  ['@org/app', '@org/app'],
  ['@org/lib', '@org/lib'],
  ['tool', 'tool']
];

const textsOf = (nodes: ProbeNode[]): string[][] => nodes.map(({ id, text }) => [id, text]);

const placesOf = (nodes: ProbeNode[]): (string | number)[][] => nodes.map(({ id, x, y }) => [id, x, y]);

test.describe('FEATURE: package labels follow scopeShown', () => {
  test(
    'GIVEN a scoped graph laid out with scopes shown, a same-hash state hiding scopes relabels nodes and rows and moves nothing',
    { annotation: SCOPE_LABELS },
    async ({ graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      let before: ProbeNode[] = [];

      await test.step('WHEN the graph is laid out with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(true));
        await graphProbe.expectNodeIds(IDS);
        await graphProbe.expectLayoutSettled();
        before = await graphProbe.nodes();
      });

      await test.step('AND the same-hash state with scopes hidden arrives', async (): Promise<void> =>
        graphHost.sendState(scopedNamesState(false)));

      await test.step('THEN node text is bare while the ids stay the package names', async (): Promise<void> => {
        await expect.poll(async (): Promise<string[][]> => textsOf(await graphProbe.nodes())).toEqual(BARE_TEXTS);
      });

      await test.step('AND every node is where it was, with no second layout', async (): Promise<void> => {
        expect(placesOf(await graphProbe.nodes())).toEqual(placesOf(before));
        await graphHost.expectLayoutDones(['elk']);
      });

      await test.step('AND the Controls rows read the bare names', async (): Promise<void> =>
        expect(graphList.nameButtons).toHaveText(['app', 'lib', 'tool']));

      await test.step('WHEN scopes are shown again', async (): Promise<void> => graphHost.sendState(scopedNamesState(true)));

      await test.step('THEN node text is the full names and every node is still where it was', async (): Promise<void> => {
        await expect.poll(async (): Promise<string[][]> => textsOf(await graphProbe.nodes())).toEqual(FULL_TEXTS);
        expect(placesOf(await graphProbe.nodes())).toEqual(placesOf(before));
      });

      await test.step('AND the Controls rows read the full names', async (): Promise<void> =>
        expect(graphList.nameButtons).toHaveText(IDS));
    }
  );

  test(
    'GIVEN scopes hidden while task mode owns the canvas, leaving task mode draws the bare labels where the nodes were',
    { annotation: SCOPE_LABELS },
    async ({ graphHost, graphPage, graphProbe, graphTask }): Promise<void> => {
      let before: ProbeNode[] = [];

      await test.step('WHEN the graph is laid out with scopes shown and task mode is entered', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(true));
        await graphProbe.expectLayoutSettled();
        before = await graphProbe.nodes();
        await graphTask.enter();
        await graphTask.expectPressed(true);
      });

      await test.step('AND the same-hash state with scopes hidden arrives, then task mode is left', async (): Promise<void> => {
        await graphHost.sendState(scopedNamesState(false));
        await graphTask.leave();
        await graphTask.expectPressed(false);
      });

      await test.step('THEN node text is bare and every node is where it was', async (): Promise<void> => {
        await expect.poll(async (): Promise<string[][]> => textsOf(await graphProbe.nodes())).toEqual(BARE_TEXTS);
        expect(placesOf(await graphProbe.nodes())).toEqual(placesOf(before));
      });
    }
  );

  test(
    'GIVEN scopes hidden and a package picked, the Details heading follows the scope toggle on the same card',
    { annotation: SCOPE_LABELS },
    async ({ graphDetails, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the graph is laid out with scopes hidden and app is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(false));
        await graphProbe.expectLayoutSettled();
        await graphList.pick('app');
      });

      await test.step('THEN the Details heading reads app', async (): Promise<void> => graphDetails.expectHeading('app'));

      await test.step('WHEN the same-hash state with scopes shown arrives', async (): Promise<void> => {
        await graphDetails.heading.evaluate((heading: Element): void => heading.setAttribute('data-kept', 'yes'));
        await graphHost.sendState(scopedNamesState(true));
      });

      await test.step('THEN the heading reads @org/app on the same card', async (): Promise<void> => {
        await graphDetails.expectHeading('@org/app');
        await expect(graphDetails.heading).toHaveAttribute('data-kept', 'yes');
      });
    }
  );

  test(
    'GIVEN scopes hidden and a package picked, its node toolbar and menu are named by the label and follow the scope toggle',
    { annotation: SCOPE_LABELS },
    async ({ graphHost, graphList, graphMenus, graphNodeToolbar, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the graph is laid out with scopes hidden and app is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(false));
        await graphProbe.expectLayoutSettled();
        await graphList.pick('app');
      });

      await test.step('THEN the node toolbar is named Package app', async (): Promise<void> =>
        expect(graphNodeToolbar.toolbarOf('app')).toBeVisible());

      await test.step('AND its "…" opens the menu named Actions for app', async (): Promise<void> => {
        await graphMenus.openPackageMenu('app');
        await expect(graphMenus.menu).toHaveAccessibleName('Actions for app');
        await graphMenus.pressKey('Escape');
        await graphMenus.expectNoMenu();
      });

      await test.step('WHEN the same-hash state with scopes shown arrives', async (): Promise<void> =>
        graphHost.sendState(scopedNamesState(true)));

      await test.step('THEN the node toolbar is named Package @org/app', async (): Promise<void> => {
        await expect(graphNodeToolbar.toolbarOf('@org/app')).toBeVisible();
        await expect(graphNodeToolbar.toolbarOf('app')).toHaveCount(0);
      });
    }
  );
});
