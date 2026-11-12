import { test } from './graph-atom-chips.fixture.ts';
import { TARGET_LIKE_UMBRELLA } from './test/utils/graph-target-like-tasks.spec.util.ts';
import type { GraphAtomCounts, GraphAtomGroupState } from '../src/bridge/common/graph-message.type.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';

const AC5 = { description: 'G2-3b AC5', type: 'requirement' };

const ALL_COUNTS: GraphAtomCounts = { files: 10, cached: 3, failed: 1 };

const ALL: GraphAtomGroupState = { counts: ALL_COUNTS, files: {} };

const ALL_GROUPS = { [TARGET_LIKE_UMBRELLA]: ALL };

const NAME_ONLY = `${GLYPH_CODE_POINTS.blank} e2e-ci`;

const EXPORT_TEXT = `${NAME_ONLY}\n10 files · 3 cached · 1 failed`;

const ANY_SIZE = { minWidth: 1, maxWidth: 4096, minHeight: 1, maxHeight: 4096 };

test.describe('FEATURE: graph task export of an umbrella', () => {
  test(
    'GIVEN counts 10/3/1 sent, the export label of the umbrella is glyph + name over the counts, and the live label is name-only after',
    { annotation: AC5 },
    async ({ openUmbrella, graphTaskHost, graphTaskProbe, graphAtomChips, graphExport }): Promise<void> => {
      await test.step('WHEN the umbrella is chosen and the counts are sent', async (): Promise<void> => {
        await openUmbrella();
        await graphTaskHost.sendAtoms(ALL_GROUPS);
      });

      await test.step('THEN its export label is the glyph and name over the counts', async (): Promise<void> =>
        graphAtomChips.expectExportLabel(TARGET_LIKE_UMBRELLA, EXPORT_TEXT));

      await test.step('AND its live label is name-only', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, NAME_ONLY));

      await test.step('WHEN Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN one PNG is posted', async (): Promise<void> => graphExport.expectOnePng(ANY_SIZE));

      await test.step('AND the live label is name-only again', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, NAME_ONLY));
    }
  );
});
