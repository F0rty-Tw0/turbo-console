import { test } from './graph-atom-chips.fixture.ts';
import { TARGET_LIKE_UMBRELLA } from './test/utils/graph-target-like-tasks.spec.util.ts';
import type { GraphAtomCounts, GraphAtomGroupState } from '../src/bridge/common/graph-message.type.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';

const AC1 = { description: 'G2-3b AC1', type: 'requirement' };

const ALL_COUNTS: GraphAtomCounts = { files: 10, cached: 3, failed: 1 };

const ALL: GraphAtomGroupState = { counts: ALL_COUNTS, files: {} };

const ALL_GROUPS = { [TARGET_LIKE_UMBRELLA]: ALL };

const STRING_COUNTS_GROUP = { counts: '10 files', files: {} };

const STRING_COUNTS_GROUPS = { [TARGET_LIKE_UMBRELLA]: STRING_COUNTS_GROUP };

const STRING_COUNTS_MESSAGE = { type: 'atoms', groups: STRING_COUNTS_GROUPS };

const NAME_ONLY = `${GLYPH_CODE_POINTS.blank} e2e-ci`;

type CountsCase = [GraphAtomCounts, string[]];

/** The chips `atomCountsText` words: the files chip always, cached once the dry run settled, failed only above 0. */
const COUNTS_CASES: CountsCase[] = [
  [{ files: 10, cached: null, failed: null }, ['10 files']],
  [{ files: 10, cached: 9, failed: 0 }, ['10 files', '9 cached']],
  [{ files: 10, cached: null, failed: 2 }, ['10 files', '2 failed']]
];

test.describe('FEATURE: graph task umbrella count chips', () => {
  test(
    'GIVEN the umbrella chosen and counts 10/3/1 sent, three chips read in order and the canvas label is glyph + name',
    { annotation: AC1 },
    async ({ openUmbrella, graphTaskHost, graphAtomChips, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen and the counts are sent', async (): Promise<void> => {
        await openUmbrella();
        await graphTaskHost.sendAtoms(ALL_GROUPS);
      });

      await test.step('THEN three chips read in order', async (): Promise<void> =>
        graphAtomChips.expectTexts(TARGET_LIKE_UMBRELLA, ['10 files', '3 cached', '1 failed']));

      await test.step('AND the canvas label is the glyph and the name', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, NAME_ONLY));
    }
  );

  test(
    'GIVEN counts 10/3/1 sent with the font arrived, each outlined chip leads with its glyph and the files chip has none',
    { annotation: AC1 },
    async ({ openUmbrella, graphTaskHost, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen and the counts are sent', async (): Promise<void> => {
        await openUmbrella();
        await graphTaskHost.sendAtoms(ALL_GROUPS);
      });

      await test.step('THEN the cached and failed chips lead with their glyph and the files chip has none', async (): Promise<void> =>
        graphAtomChips.expectGlyphsLeadOutlinedChips(TARGET_LIKE_UMBRELLA));
    }
  );

  for (const [counts, texts] of COUNTS_CASES) {
    test(
      `GIVEN counts ${JSON.stringify(counts)} sent, the chips read ${JSON.stringify(texts)}`,
      { annotation: AC1 },
      async ({ openUmbrella, graphTaskHost, graphAtomChips }): Promise<void> => {
        await test.step('WHEN the umbrella is chosen and the counts are sent', async (): Promise<void> => {
          await openUmbrella();
          const group: GraphAtomGroupState = { counts, files: {} };
          const groups = { [TARGET_LIKE_UMBRELLA]: group };

          await graphTaskHost.sendAtoms(groups);
        });

        await test.step('THEN the chips read in order', async (): Promise<void> =>
          graphAtomChips.expectTexts(TARGET_LIKE_UMBRELLA, texts));
      }
    );
  }

  test(
    'GIVEN no atoms message yet, the umbrella shows its fallback "10 files" chip',
    { annotation: AC1 },
    async ({ openUmbrella, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('THEN one chip reads 10 files', async (): Promise<void> =>
        graphAtomChips.expectTexts(TARGET_LIKE_UMBRELLA, ['10 files']));
    }
  );

  test(
    'GIVEN a raw atoms message whose counts are the string "10 files", the chips are unchanged',
    { annotation: AC1 },
    async ({ openUmbrella, graphTaskHost, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen and the string-counts message is sent', async (): Promise<void> => {
        await openUmbrella();
        await graphTaskHost.sendRaw(STRING_COUNTS_MESSAGE);
      });

      await test.step('THEN one chip still reads 10 files', async (): Promise<void> =>
        graphAtomChips.expectTexts(TARGET_LIKE_UMBRELLA, ['10 files']));
    }
  );

  test(
    'GIVEN task mode left, no chip row remains in the DOM',
    { annotation: AC1 },
    async ({ openUmbrella, graphTask, graphAtomChips }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen', async (): Promise<void> => openUmbrella());

      await test.step('AND task mode is left', async (): Promise<void> => graphTask.leave());

      await test.step('THEN no row is in the DOM for the umbrella', async (): Promise<void> =>
        graphAtomChips.expectNoRow(TARGET_LIKE_UMBRELLA));
    }
  );
});
