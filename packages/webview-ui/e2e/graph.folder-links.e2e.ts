import { expect } from '@playwright/test';

import { test as base } from './graph-routes.fixture.ts';
import { GraphFolderLinks } from './pages/graph-folder-links.po.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { GROUPED_SAVED, LIBS_UI } from './test/utils/graph-u0-routes.spec.util.ts';
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

/** The drag of the package a link reaches, in page px. */
const DRAG_DX = 40;

const DRAG_DY = 30;

const pairKeyOf = (first: string, second: string): string => {
  const ends = [first, second];
  const sorted = ends.toSorted();

  return sorted.join('>');
};

const joinsAppsAndLibsUi = (link: ProbeFolderLink): boolean => pairKeyOf(link.source, link.target) === pairKeyOf(APPS, LIBS_UI);

test.describe('FEATURE: folder links keep their labels off their lines and their ends on the node borders', () => {
  for (const folder of U0_FOLDERS)
    test(`GIVEN the U0 workspace grouped WHEN ${folder} alone is collapsed THEN its folder link labels sit off their lines and their collapsed ends on the node borders (d2)`, async ({
      graphFolderLinks,
      graphFolders,
      graphHost,
      graphCanvas,
      graphPage,
      graphProbe
    }): Promise<void> => {
      await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: GROUPED_SAVED });
        await graphHost.sendState(U0);
      });

      await test.step('AND ELK has laid it out and Fit frames it', async (): Promise<void> => {
        await graphProbe.expectLayoutEngine('elk');
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

      await test.step('AND no label sits on its own line', async (): Promise<void> => graphFolderLinks.expectLabelsOffTheirLines());

      await test.step('AND each collapsed end lies on its node border', async (): Promise<void> =>
        graphFolderLinks.expectCollapsedEndsOnBorder());
    });

  test('GIVEN apps and libs/ui collapsed together THEN a link joins them and both ends sit on the node borders', async ({
    graphFolderLinks,
    graphFolders,
    graphHost,
    graphCanvas,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and ELK has laid it out', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphProbe.expectLayoutEngine('elk');
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

    await test.step('AND every collapsed end lies on its node border and no label sits on its line', async (): Promise<void> => {
      await graphFolderLinks.expectCollapsedEndsOnBorder();
      await graphFolderLinks.expectLabelsOffTheirLines();
    });
  });

  test('GIVEN apps collapsed WHEN a package outside it that one apps link reaches is dragged THEN the labels are placed again, off their lines', async ({
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
      await graphPage.pressButton('Fit');
      await graphCanvas.expectAllNodesInView();
    });

    await test.step('AND apps is collapsed from the list', async (): Promise<void> => {
      await graphFolders.toggleInList(APPS, true);
      await graphFolderLinks.expectDrawn();
    });

    const dragged = await graphFolderLinks.packageEnd();

    await test.step('AND the package one apps link reaches is in view', async (): Promise<void> =>
      graphRoutes.expectNodeInView(dragged, graphCanvas.container));

    await test.step('AND it is dragged by 40 px right and 30 px down', async (): Promise<void> =>
      graphCanvas.dragNode(dragged, DRAG_DX, DRAG_DY));

    await test.step('THEN no label sits on its own line', async (): Promise<void> => graphFolderLinks.expectLabelsOffTheirLines());
  });
});
