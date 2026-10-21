import { test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import {
  DATA_ROWS_STUB,
  FOUND_DATA_STUB,
  FOUND_UI_STUB,
  MISSING_STUB,
  OPEN_UI_FIRST_STUB,
  UI_DEV_ROWS_STUB,
  UI_ENTRIES_STUB,
  UI_ENTRY_ROWS_STUB,
  UNREADABLE_STUB
} from './test/stubs/graph-explain.stub.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

test.describe('FEATURE: graph link excerpt', () => {
  test(
    'GIVEN a link with two entries, each excerpt shows trimmed rows around its marked line and Open at line is one-based',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('THEN the first excerpt numbers its rows 5, 6 and 7 and marks row 6', async (): Promise<void> =>
        graphLink.expectExcerpt('dependencies', 'ui', UI_ENTRY_ROWS_STUB));

      await test.step('AND the entries are labelled with one-based lines 6 and 10', async (): Promise<void> =>
        graphLink.expectEntries(UI_ENTRIES_STUB));

      await test.step('WHEN the first Open at line 6 is pressed', async (): Promise<void> =>
        graphLink.pressOpen('dependencies', 'ui'));

      await test.step('THEN the host got one openManifest for line 5', async (): Promise<void> =>
        graphReplies.expectOpenManifestPosted(OPEN_UI_FIRST_STUB));
    }
  );

  test(
    'GIVEN entries with a side or both sides of their context absent, the excerpt leaves those rows out',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('THEN the devDependencies excerpt has no row after its entry', async (): Promise<void> =>
        graphLink.expectExcerpt('devDependencies', 'ui', UI_DEV_ROWS_STUB));

      await test.step('WHEN the web to data link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'data'));

      await test.step('AND the host answers with an entry with no context', async (): Promise<void> =>
        graphReplies.answerExplain(FOUND_DATA_STUB));

      await test.step('THEN the excerpt is the entry row alone', async (): Promise<void> =>
        graphLink.expectExcerpt('dependencies', 'data', DATA_ROWS_STUB));
    }
  );

  test(
    'GIVEN a missing and an unreadable manifest, each status is an icon and a word with no coloured side border',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers that no entry exists', async (): Promise<void> =>
        graphReplies.answerExplain(MISSING_STUB));

      await test.step('THEN the status is the info icon and No entry', async (): Promise<void> =>
        graphLink.expectMissing('apps/web/package.json', 'ui'));

      await test.step('AND it has no side border', async (): Promise<void> => graphLink.expectNoSideBorder('No entry'));

      await test.step('WHEN the web to data link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'data'));

      await test.step('AND the host answers that it could not read the manifest', async (): Promise<void> =>
        graphReplies.answerExplain(UNREADABLE_STUB));

      await test.step('THEN the status is the warning icon and Unreadable', async (): Promise<void> =>
        graphLink.expectUnreadable('apps/web/package.json'));

      await test.step('AND there is no Open button', async (): Promise<void> => graphLink.expectNoOpenButton());

      await test.step('AND it has no side border', async (): Promise<void> => graphLink.expectNoSideBorder('Unreadable'));
    }
  );
});
