import { expect } from '@playwright/test';

import { TOGGLED_FOLDERS } from './common/graph-tripwire.const.ts';
import { test as base } from './graph-routes.fixture.ts';
import { GraphFolderLinks } from './pages/graph-folder-links.po.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { ALL_EDGE_IDS, GROUPED_SAVED, LIBS_UI } from './test/utils/graph-u0-routes.spec.util.ts';
import type { ProbeFolderLink } from '../src/graph/common/graph-probe.type.ts';

type FolderLinksFixtures = {
  readonly graphFolderLinks: GraphFolderLinks;
};

/** The routes fixtures plus the folder links the page draws. */
const test = base.extend<FolderLinksFixtures>({
  graphFolderLinks: async ({ page }, use): Promise<void> => {
    await use(new GraphFolderLinks(page));
  }
});

const U0 = U0_STATE_STUB;

/** The folders of the U0 workspace, by their stub paths. */
const U0_FOLDERS = ['apps', 'packages', 'libs/data', 'libs/ui', 'tools', 'services'];

const APPS = 'apps';

const GROUP_COUNT = 30;

/** The drag of the package a link reaches, in page px. */
const DRAG_DX = 40;

const DRAG_DY = 30;

const pairKeyOf = (first: string, second: string): string => {
  const ends = [first, second];
  const sorted = ends.toSorted();

  return sorted.join('>');
};

const joinsAppsAndLibsUi = (link: ProbeFolderLink): boolean => pairKeyOf(link.source, link.target) === pairKeyOf(APPS, LIBS_UI);

const sumOf = (counts: number[]): number => {
  const addCount = (sum: number, count: number): number => sum + count;

  return counts.reduce(addCount, 0);
};

test.describe('FEATURE: folder links stay clear of nodes, folder boxes and their own labels', () => {
  for (const folder of U0_FOLDERS)
    test(`GIVEN the U0 workspace grouped WHEN ${folder} alone is collapsed THEN its folder links cross no node, foreign box or title band, and their labels sit off their lines (d2)`, async ({
      graphFolderLinks,
      graphFolders,
      graphHost,
      graphCanvas,
      graphPage,
      graphProbe,
      graphRoutes
    }): Promise<void> => {
      await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: GROUPED_SAVED });
        await graphHost.sendState(U0);
      });

      await test.step('AND ELK has laid it out and Fit frames it', async (): Promise<void> => {
        await graphProbe.expectLayoutEngine('elk');
        await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
        await graphPage.pressButton('Fit');
        await graphCanvas.expectAllNodesInView();
      });

      await test.step(`AND ${folder} is collapsed from the list`, async (): Promise<void> => {
        await graphFolders.toggleInList(folder, true);
        await graphFolderLinks.expectDrawn();
      });

      await test.step('THEN the counts of each oracle are recorded', async (): Promise<void> => {
        const counts = await graphFolderLinks.counts();

        test.info().annotations.push({ type: 'folder-links', description: `${folder}: ${JSON.stringify(counts)}` });
      });

      await test.step('AND no folder link crosses a node', async (): Promise<void> =>
        graphFolderLinks.expectNoFolderLinkThroughNodes());

      await test.step('AND none crosses a foreign box or title band', async (): Promise<void> =>
        graphFolderLinks.expectNoFolderLinkOverForeignBoxes());

      await test.step('AND no label sits on its own line', async (): Promise<void> => graphFolderLinks.expectLabelsOffTheirLines());

      await test.step('AND each collapsed end lies on its node border', async (): Promise<void> =>
        graphFolderLinks.expectCollapsedEndsOnBorder());
    });

  test('GIVEN the U0 workspace grouped WHEN each folder is collapsed alone THEN at least one folder link is routed (d2 proof the record reached the folder pass)', async ({
    graphFolderLinks,
    graphFolders,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and ELK has laid it out', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
    });

    const routedCounts = await test.step('AND each folder is collapsed and expanded in turn', async (): Promise<number[]> => {
      const counts: number[] = [];

      for (const folder of U0_FOLDERS) {
        await graphFolders.toggleInList(folder, true);
        await graphFolderLinks.expectDrawn();

        const routed = await graphFolderLinks.routedFolderLinkCount();

        counts.push(routed);
        test.info().annotations.push({ type: 'routed-folder-links', description: `${folder}: ${routed}` });

        await graphFolders.toggleInList(folder, false);
        await graphFolders.expectListToggle(folder, true);
      }

      return counts;
    });

    await test.step('THEN at least one folder link was routed', (): void => {
      expect(sumOf(routedCounts)).toBeGreaterThanOrEqual(1);
    });
  });

  test('GIVEN apps and libs/ui collapsed together THEN the link between them crosses no node or foreign box and both ends sit on the node borders', async ({
    graphFolderLinks,
    graphFolders,
    graphHost,
    graphCanvas,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and ELK has laid it out', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
      await graphPage.pressButton('Fit');
      await graphCanvas.expectAllNodesInView();
    });

    await test.step('AND apps and libs/ui are collapsed from the list', async (): Promise<void> => {
      await graphFolders.toggleInList(APPS, true);
      await graphFolders.toggleInList(LIBS_UI, true);
      await graphFolderLinks.expectDrawn();
    });

    await test.step('THEN a folder link joins them', async (): Promise<void> => {
      const hasLink = async (): Promise<boolean> => {
        const links = await graphFolders.folderLinks();

        return links.some(joinsAppsAndLibsUi);
      };

      await expect.poll(hasLink).toBe(true);
    });

    await test.step('AND no folder link crosses a node or a foreign box', async (): Promise<void> => {
      await graphFolderLinks.expectNoFolderLinkThroughNodes();
      await graphFolderLinks.expectNoFolderLinkOverForeignBoxes();
    });

    await test.step('AND every collapsed end lies on its node border and no label sits on its line', async (): Promise<void> => {
      await graphFolderLinks.expectCollapsedEndsOnBorder();
      await graphFolderLinks.expectLabelsOffTheirLines();
    });
  });

  test('GIVEN apps collapsed WHEN a package outside it that one apps link reaches is dragged THEN that link goes straight and the links that were routed before the drag stay routed, labels off their lines', async ({
    graphCanvas,
    graphFolderLinks,
    graphFolders,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and ELK has laid it out', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
      await graphPage.pressButton('Fit');
      await graphCanvas.expectAllNodesInView();
    });

    await test.step('AND apps is collapsed from the list', async (): Promise<void> => {
      await graphFolders.toggleInList(APPS, true);
      await graphFolderLinks.expectDrawn();
    });

    const before = await graphFolderLinks.routedLinks();
    const dragged = await graphFolderLinks.routedPackageEnd();

    await test.step('AND the package one routed apps link reaches is in view', async (): Promise<void> =>
      graphRoutes.expectNodeInView(dragged, graphCanvas.container));

    await test.step('AND it is dragged by 40 px right and 30 px down', async (): Promise<void> =>
      graphCanvas.dragNode(dragged, DRAG_DX, DRAG_DY));

    await test.step('THEN its link is straight and every other link routed before the drag stays routed', async (): Promise<void> =>
      graphFolderLinks.expectRoutedExceptEndingOn(before, dragged));

    await test.step('AND no label sits on its own line', async (): Promise<void> => graphFolderLinks.expectLabelsOffTheirLines());
  });

  test('GIVEN 300 packages grouped with every folder expanded WHEN each toggled folder is collapsed alone THEN at least one draws a routed folder link (d3)', async ({
    graphFolderLinks,
    graphFolders,
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    const state = largeState();

    await test.step('WHEN the page is opened grouped and the 300-package state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: groupedSavedState(state.hash) });
      await graphHost.sendState(state);
    });

    await test.step('AND the grouped layout has finished', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphGrouping.expectFolderCount(GROUP_COUNT);
    });

    const routedCounts = await test.step('AND each toggled folder is collapsed and expanded in turn', async (): Promise<number[]> => {
      const counts: number[] = [];

      for (const folder of TOGGLED_FOLDERS) {
        await graphFolders.toggleInList(folder, true);
        await graphFolderLinks.expectDrawn();

        const routed = await graphFolderLinks.routedFolderLinkCount();

        counts.push(routed);
        test.info().annotations.push({ type: 'routed-folder-links', description: `${folder}: ${routed}` });

        await graphFolders.toggleInList(folder, false);
        await graphFolders.expectListToggle(folder, true);
      }

      return counts;
    });

    await test.step('THEN at least one folder draws a routed link', (): void => {
      expect(sumOf(routedCounts)).toBeGreaterThanOrEqual(1);
    });
  });
});
