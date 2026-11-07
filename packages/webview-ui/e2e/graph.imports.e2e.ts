import type { ImportGroupFacts, ImportRowFacts } from './common/graph-imports.type.ts';
import { test } from './graph-imports.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { FAILED_STUB, FOUND_WEB_UI_STUB, LIMIT_FOUND_STUB, NONE_SKIPPED_STUB, NONE_STUB } from './test/stubs/graph-imports.stub.ts';
import { foundOf } from './test/utils/graph-imports.spec.util.ts';
import { linkInspection } from './test/utils/graph-inspection.spec.util.ts';
import type { GraphOpenImportMessage, ImportLimit } from '../src/bridge/common/graph-imports.type.ts';

const A_FIRST_ROW: ImportRowFacts = { number: 4, text: "import { Button } from 'ui';", tags: [] };

const A_SECOND_ROW: ImportRowFacts = { number: 9, text: "import { Card } from 'ui';", tags: [] };

const B_ROW: ImportRowFacts = { number: 1, text: "type Ui = import('ui').Ui;", tags: ['type', 'dynamic'] };

const A_GROUP: ImportGroupFacts = { file: 'src/a.ts', rows: [A_FIRST_ROW, A_SECOND_ROW] };

const B_GROUP: ImportGroupFacts = { file: 'src/b.ts', rows: [B_ROW] };

const FOUND_GROUPS: ImportGroupFacts[] = [A_GROUP, B_GROUP];

const OPEN_A_FIRST: GraphOpenImportMessage = { type: 'openImport', packageName: 'web', file: 'src/a.ts', line: 3 };

const NONE_LINE = 'No file in web imports ui (3 files scanned).';

const SKIPPED_NOTE = 'Scanned 3 files, skipped 2 (over 1 MiB, unreadable or path too long).';

const LIMIT_NOTES: Record<ImportLimit, string> = {
  files: 'Stopped at 5,000 files; there may be more.',
  entries: 'Stopped at 50,000 folder entries; there may be more.',
  time: 'Stopped after 4 s; there may be more.'
};

const LIMITS: ImportLimit[] = ['files', 'entries', 'time'];

test.describe('FEATURE: graph link imports block', () => {
  test('GIVEN a link with no reply yet, the block says it is looking and Scan again is disabled', async ({
    detailsImports,
    graphDetails,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('THEN that link is inspected', async (): Promise<void> =>
      graphDetails.expectInspection(linkInspection('web', 'ui')));

    await test.step('AND the block is looking for imports of ui in web', async (): Promise<void> =>
      detailsImports.expectScanning('web', 'ui'));
  });

  test('GIVEN a found reply, the heading counts the sites and the rows are grouped by file', async ({
    detailsImports,
    graphImports,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the host finds three sites', async (): Promise<void> => graphImports.answerImports(FOUND_WEB_UI_STUB));

    await test.step('THEN the heading counts three and the rows show one-based lines, text and tags', async (): Promise<void> =>
      detailsImports.expectFound('Imports of ui (3)', FOUND_GROUPS));
  });

  test('GIVEN a found reply, pressing a row posts one openImport for its zero-based line', async ({
    detailsImports,
    graphImports,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the host finds three sites', async (): Promise<void> => graphImports.answerImports(FOUND_WEB_UI_STUB));

    await test.step('THEN the host got no openImport yet', async (): Promise<void> => graphImports.expectNoOpenImport());

    await test.step('WHEN the row of src/a.ts line 4 is pressed', async (): Promise<void> => detailsImports.openRow('src/a.ts', 4));

    await test.step('THEN the host got one openImport for line 3 of src/a.ts in web', async (): Promise<void> =>
      graphImports.expectOpenImportPosted([OPEN_A_FIRST]));
  });

  test('GIVEN no import found, a clean scan and a scan that skipped files say different words', async ({
    detailsImports,
    graphImports,
    graphReplies,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the host finds nothing in three files', async (): Promise<void> => graphImports.answerImports(NONE_STUB));

    await test.step('THEN the block says No imports found with the scanned count', async (): Promise<void> =>
      detailsImports.expectNone('No imports found', NONE_LINE));

    await test.step('WHEN Scan again is pressed', async (): Promise<void> => detailsImports.scanAgain());

    await test.step('THEN the host was asked to scan twice', async (): Promise<void> =>
      graphReplies.expectImportsAsked('web', 'ui', 2));

    await test.step('WHEN the host skipped two files', async (): Promise<void> => graphImports.answerImports(NONE_SKIPPED_STUB, 2));

    await test.step('THEN the block says None found in scanned files', async (): Promise<void> =>
      detailsImports.expectNone('None found in scanned files', NONE_LINE));

    await test.step('AND a note counts the skipped files', async (): Promise<void> => detailsImports.expectNotes([SKIPPED_NOTE]));
  });

  test('GIVEN a failed scan, Scan again asks the host again without asking to explain again', async ({
    detailsImports,
    graphImports,
    graphReplies,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the scan fails', async (): Promise<void> => graphImports.answerImports(FAILED_STUB));

    await test.step("THEN the block says Couldn't scan and names web", async (): Promise<void> => detailsImports.expectFailed('web'));

    await test.step('WHEN Scan again is pressed', async (): Promise<void> => detailsImports.scanAgain());

    await test.step('THEN the host was asked to scan twice', async (): Promise<void> =>
      graphReplies.expectImportsAsked('web', 'ui', 2));

    await test.step('AND it was asked to explain once', async (): Promise<void> => graphReplies.expectExplainAsked('web', 'ui', 1));

    await test.step('AND the block is looking again', async (): Promise<void> => detailsImports.expectScanning('web', 'ui'));
  });

  for (const limit of LIMITS) {
    test(`GIVEN a scan stopped at the ${limit} cap, the block notes it`, async ({
      detailsImports,
      graphImports,
      shownLink
    }): Promise<void> => {
      await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

      await test.step('AND the host answers with that cap', async (): Promise<void> =>
        graphImports.answerImports(LIMIT_FOUND_STUB[limit]));

      await test.step("THEN the one note is that cap's text", async (): Promise<void> =>
        detailsImports.expectNotes([LIMIT_NOTES[limit]]));
    });
  }

  test('GIVEN 200 of 250 sites sent, twenty rows show and Show more unfolds them with focus on row 21', async ({
    detailsImports,
    graphImports,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the host sends 200 of 250 sites', async (): Promise<void> => graphImports.answerImports(foundOf(200, 250)));

    await test.step('THEN twenty rows are shown', async (): Promise<void> => detailsImports.expectRowCount(20));

    await test.step('AND Show more counts the 180 folded rows', async (): Promise<void> =>
      detailsImports.expectShowMore('Show 180 more'));

    await test.step('AND a note says 200 of 250 are shown', async (): Promise<void> =>
      detailsImports.expectNotes(['Showing 200 of 250 imports.']));

    await test.step('WHEN Show more is pressed', async (): Promise<void> => detailsImports.showMore());

    await test.step('THEN all 200 rows are shown', async (): Promise<void> => detailsImports.expectRowCount(200));

    await test.step('AND focus is on row 21, the first one that was folded', async (): Promise<void> =>
      detailsImports.expectFocusOnRow('src/m2.ts', 1));
  });

  test('GIVEN a found list, Scan again keeps focus through the stale redraw and the reply', async ({
    detailsImports,
    graphImports,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the host finds three sites', async (): Promise<void> => graphImports.answerImports(FOUND_WEB_UI_STUB));

    await test.step('AND Scan again is focused', async (): Promise<void> => detailsImports.focusScanAgain());

    await test.step('AND Enter is pressed', async (): Promise<void> => detailsImports.pressEnter());

    await test.step('THEN the three rows are kept and marked as scanning again', async (): Promise<void> =>
      detailsImports.expectStale(3));

    await test.step('AND focus is still on Scan again', async (): Promise<void> => detailsImports.expectFocusOnScanAgain());

    await test.step('WHEN the host finds the same sites', async (): Promise<void> => graphImports.answerImports(FOUND_WEB_UI_STUB, 2));

    await test.step('THEN the block is no longer stale', async (): Promise<void> => detailsImports.expectNotStale());

    await test.step('AND focus is still on Scan again', async (): Promise<void> => detailsImports.expectFocusOnScanAgain());
  });

  test('GIVEN a focused row, a same-hash state asks again and the reply gives focus back to that row', async ({
    detailsImports,
    graphHost,
    graphImports,
    graphReplies,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the host finds three sites', async (): Promise<void> => graphImports.answerImports(FOUND_WEB_UI_STUB));

    await test.step('AND the row of src/a.ts line 4 is focused', async (): Promise<void> => detailsImports.focusRow('src/a.ts', 4));

    await test.step('AND the same details graph is sent again', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

    await test.step('THEN the host was asked to scan a second time', async (): Promise<void> =>
      graphReplies.expectImportsAsked('web', 'ui', 2));

    await test.step('WHEN the host finds the same sites', async (): Promise<void> => graphImports.answerImports(FOUND_WEB_UI_STUB, 2));

    await test.step('THEN focus is on that row again', async (): Promise<void> => detailsImports.expectFocusOnRow('src/a.ts', 4));
  });

  test('GIVEN a reply for another link, the shown link keeps scanning and the late reply for the first link is dropped', async ({
    detailsImports,
    graphImports,
    graphLink,
    shownLink
  }): Promise<void> => {
    await test.step('WHEN the web to ui link is shown', async (): Promise<void> => shownLink('web', 'ui'));

    await test.step('AND the host answers for ui to core', async (): Promise<void> =>
      graphImports.answerImportsFor('ui', 'core', FOUND_WEB_UI_STUB));

    await test.step('THEN the web to ui block is still scanning with no rows', async (): Promise<void> =>
      detailsImports.expectScanning('web', 'ui'));

    await test.step('WHEN the ui to core link is tapped', async (): Promise<void> => graphLink.tapLink('ui', 'core'));

    await test.step('THEN the ui to core block is scanning with no rows', async (): Promise<void> =>
      detailsImports.expectScanning('ui', 'core'));

    await test.step('WHEN the host answers late for web to ui', async (): Promise<void> =>
      graphImports.answerImportsFor('web', 'ui', FOUND_WEB_UI_STUB));

    await test.step('THEN the ui to core block is still scanning with no rows', async (): Promise<void> =>
      detailsImports.expectScanning('ui', 'core'));
  });
});
