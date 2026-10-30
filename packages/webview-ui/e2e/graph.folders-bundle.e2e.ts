import type { BundleViewFacts, FolderLinkFacts } from './common/graph-folders.type.ts';
import { test } from './graph-toolbar.fixture.ts';
import { collapsedSavedState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { bundleInspection, folderInspection, linkInspection } from './test/utils/graph-inspection.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';
import { collapsedIdOf } from '../src/graph/utils/folder-id.util.ts';

const BOARDS = placedBoardsState();

const SAVED = collapsedSavedState(BOARDS.hash, ['packages']);

const PACKAGES_LINKS: FolderLinkFacts[] = [
  { source: 'docs', target: 'packages', count: 2 },
  { source: 'web', target: 'packages', count: 1 }
];

const DOCS_BUNDLE: BundleViewFacts = {
  lead: 'docs depends on packages',
  count: '2 links',
  rows: ['docs depends on @acme/ui', 'docs depends on @acme/utils']
};

/** Both panels at their 200 px minimum, the width a bundle row's text and Explain have to share. */
const NARROW_WIDTHS = { controls: 200, details: 200 };

const NARROW_SAVED = { ...SAVED, panelWidths: NARROW_WIDTHS };

const DOCS_INSPECTION = bundleInspection('docs', collapsedIdOf('packages'));

test.describe('FEATURE: folder link bundle', () => {
  test('GIVEN packages collapsed, tapping the docs link to it lists both links and keeps the folder collapsed', async ({
    graphBundle,
    graphDetails,
    graphFolderInspect,
    graphFolders,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with packages collapsed', async (): Promise<void> =>
      graphFolderInspect.open(SAVED, BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> =>
      graphPage.pressButton(FIT_LABEL));

    await test.step('THEN both ends of the docs link are in view', async (): Promise<void> =>
      graphBundle.expectEndsInView('docs', 'packages'));

    await test.step('WHEN the docs link to packages is tapped', async (): Promise<void> =>
      graphBundle.tapFolderLink('docs', 'packages'));

    await test.step('THEN the bundle is inspected', async (): Promise<void> => graphDetails.expectInspection(DOCS_INSPECTION));

    await test.step('AND packages is still collapsed', async (): Promise<void> => graphFolders.expectFolderLinks(PACKAGES_LINKS));

    await test.step('AND the docs link to packages is selected', async (): Promise<void> =>
      graphFolderInspect.expectFolderLinkState('docs', 'packages', 'selected'));

    await test.step('AND the status line counts the links', async (): Promise<void> =>
      graphPage.expectStatus('2 links: docs → packages'));

    await test.step('AND the details list both links', async (): Promise<void> => graphBundle.expectBundleView(DOCS_BUNDLE));
  });

  test('GIVEN packages collapsed, tapping the edge of the docs link label inspects the bundle', async ({
    graphBundle,
    graphDetails,
    graphFolderInspect,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with packages collapsed', async (): Promise<void> =>
      graphFolderInspect.open(SAVED, BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> =>
      graphPage.pressButton(FIT_LABEL));

    await test.step('THEN both ends of the docs link are in view', async (): Promise<void> =>
      graphBundle.expectEndsInView('docs', 'packages'));

    await test.step('WHEN the docs link label is tapped 3 px in from its left edge', async (): Promise<void> =>
      graphBundle.tapFolderLinkLabel('docs', 'packages'));

    await test.step('THEN the bundle is inspected', async (): Promise<void> => graphDetails.expectInspection(DOCS_INSPECTION));

    await test.step('AND the status line counts the links', async (): Promise<void> =>
      graphPage.expectStatus('2 links: docs → packages'));
  });

  test('GIVEN packages collapsed, Explain on a bundle row opens that link and expands the folder', async ({
    graphBundle,
    graphDetails,
    graphFolderInspect,
    graphFolders,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with packages collapsed', async (): Promise<void> =>
      graphFolderInspect.open(SAVED, BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> =>
      graphPage.pressButton(FIT_LABEL));

    await test.step('THEN both ends of the docs link are in view', async (): Promise<void> =>
      graphBundle.expectEndsInView('docs', 'packages'));

    await test.step('WHEN the docs link to packages is tapped', async (): Promise<void> =>
      graphBundle.tapFolderLink('docs', 'packages'));

    await test.step('THEN the bundle is inspected', async (): Promise<void> => graphDetails.expectInspection(DOCS_INSPECTION));

    await test.step('WHEN Explain is pressed on the docs to ui row', async (): Promise<void> =>
      graphBundle.pressExplain('docs', '@acme/ui'));

    await test.step('THEN that link is inspected', async (): Promise<void> =>
      graphDetails.expectInspection(linkInspection('docs', '@acme/ui')));

    await test.step('AND no folder is collapsed any more', async (): Promise<void> => graphFolders.expectFolderLinks([]));
  });

  test('GIVEN packages collapsed and the Details panel at its minimum width, every bundle row keeps Explain on one line', async ({
    graphBundle,
    graphDetails,
    graphFolderInspect,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open with both panels at 200 px', async (): Promise<void> =>
      graphFolderInspect.open(NARROW_SAVED, BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> =>
      graphPage.pressButton(FIT_LABEL));

    await test.step('THEN both ends of the docs link are in view', async (): Promise<void> =>
      graphBundle.expectEndsInView('docs', 'packages'));

    await test.step('WHEN the docs link to packages is tapped', async (): Promise<void> =>
      graphBundle.tapFolderLink('docs', 'packages'));

    await test.step('THEN the bundle is inspected', async (): Promise<void> => graphDetails.expectInspection(DOCS_INSPECTION));

    await test.step('AND both rows show Explain on one line', async (): Promise<void> =>
      graphBundle.expectExplainOnOneLine(DOCS_BUNDLE.rows.length));
  });

  test('GIVEN packages collapsed, the folder end of a bundle selects the folder', async ({
    graphBundle,
    graphDetails,
    graphFolderInspect,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with packages collapsed', async (): Promise<void> =>
      graphFolderInspect.open(SAVED, BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> =>
      graphPage.pressButton(FIT_LABEL));

    await test.step('THEN both ends of the docs link are in view', async (): Promise<void> =>
      graphBundle.expectEndsInView('docs', 'packages'));

    await test.step('WHEN the docs link to packages is tapped', async (): Promise<void> =>
      graphBundle.tapFolderLink('docs', 'packages'));

    await test.step('THEN the bundle is inspected', async (): Promise<void> => graphDetails.expectInspection(DOCS_INSPECTION));

    await test.step('WHEN the packages end is pressed', async (): Promise<void> => graphBundle.pressFolderEnd('packages'));

    await test.step('THEN the packages folder is inspected', async (): Promise<void> =>
      graphDetails.expectInspection(folderInspection('packages')));
  });

  test('GIVEN packages collapsed, Escape on the canvas ends the bundle inspection', async ({
    graphBundle,
    graphDetails,
    graphFolderInspect,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped with packages collapsed', async (): Promise<void> =>
      graphFolderInspect.open(SAVED, BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> =>
      graphPage.pressButton(FIT_LABEL));

    await test.step('THEN both ends of the docs link are in view', async (): Promise<void> =>
      graphBundle.expectEndsInView('docs', 'packages'));

    await test.step('WHEN the docs link to packages is tapped', async (): Promise<void> =>
      graphBundle.tapFolderLink('docs', 'packages'));

    await test.step('THEN the bundle is inspected', async (): Promise<void> => graphDetails.expectInspection(DOCS_INSPECTION));

    await test.step('WHEN Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

    await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection({ kind: 'none' }));

    await test.step('AND the status line is empty', async (): Promise<void> => graphPage.expectStatus(''));
  });
});
