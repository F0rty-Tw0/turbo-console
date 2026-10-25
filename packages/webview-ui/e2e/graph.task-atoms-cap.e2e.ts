import { test } from './graph-task.fixture.ts';
import { THEME_HC_STUB } from './test/stubs/graph-theme.stub.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeFileIds } from './test/utils/graph-target-like-tasks.spec.util.ts';
import type { GraphAtomGroupState } from '../src/bridge/common/graph-message.type.ts';
import type { Positions } from '../src/bridge/common/graph-state.type.ts';
import { ATOM_MORE_PREFIX } from '../src/graph/common/graph-atom.const.ts';

const CAP_SPEC = { description: '2026-10-25-graph-atom-cap §5', type: 'requirement' };

const FILE_COUNT = 200;

const FILE_IDS = targetLikeFileIds(FILE_COUNT);

const FAILED_FILE = FILE_IDS[149] ?? '';

const FIRST_NINE = FILE_IDS.slice(0, 9);

const FIRST_TEN = FILE_IDS.slice(0, 10);

/** The failed file first, then the free files in order: the ten an expanded group draws before its count node. */
const CAPPED_DRAWN = [FAILED_FILE, ...FIRST_NINE];

const MORE_ID = `${ATOM_MORE_PREFIX}${TARGET_LIKE_UMBRELLA}`;

const MORE_TEXT = '+190 more';

/** 4 columns of 96 px and 3 gaps of 8 px, and the box padding of 12 px on both sides. */
const MIN_BOX_WIDTH = 4 * 96 + 3 * 8 + 2 * 12;

/** The high contrast stub's failed colour as Cytoscape reports it. */
const FAILED_OUTCOME = { width: 2, colour: 'rgb(244, 135, 113)' };

const FAILED_FILES = { [FAILED_FILE]: 'failed' } as const;

const FAILED_STATE: GraphAtomGroupState = { counts: '200 files · 1 failed', files: FAILED_FILES };

const FAILED_GROUPS = { [TARGET_LIKE_UMBRELLA]: FAILED_STATE };

test.describe('FEATURE: graph task mode with a capped Atomizer group', () => {
  test(
    'GIVEN the umbrella chosen with 200 files and a failed file after the tenth, a double tap on the umbrella draws the failed file and the first nine, then a count node of the other 190',
    { annotation: CAP_SPEC },
    async ({ graphAtomCap, graphAtoms, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      await test.step('AND atoms arrive with the 150th file failed', async (): Promise<void> =>
        graphTaskHost.sendAtoms(FAILED_GROUPS));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN exactly the failed file and the first nine are drawn', async (): Promise<void> =>
        graphAtomCap.expectDrawnOf(FILE_IDS, CAPPED_DRAWN));

      await test.step('AND the count node reads 190 more', async (): Promise<void> => graphTaskProbe.expectText(MORE_ID, MORE_TEXT));

      await test.step('AND the box is wide enough for four columns', async (): Promise<void> =>
        graphAtomCap.expectBoxWidthAtLeast(TARGET_LIKE_UMBRELLA, MIN_BOX_WIDTH));
    }
  );

  test(
    'GIVEN the umbrella chosen with 200 files and its group expanded, a double tap on the count node removes the box and puts every node back',
    { annotation: CAP_SPEC },
    async ({ graphAtomCap, graphAtoms, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      const before = await test.step('AND the task positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND the count node is drawn', async (): Promise<void> => graphTaskProbe.expectText(MORE_ID, MORE_TEXT));

      await test.step('AND the count node is double tapped', async (): Promise<void> => graphAtoms.toggle(MORE_ID));

      await test.step('THEN the box and the files are gone', async (): Promise<void> => {
        await graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, false);
        await graphAtomCap.expectDrawnOf(FILE_IDS, []);
      });

      await test.step('AND every node is where it was', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );

  test(
    'GIVEN the umbrella chosen with 200 files and its group expanded with no outcomes, a failed file arriving swaps it in for the tenth file with the failed outline',
    { annotation: CAP_SPEC },
    async ({ graphAtomCap, graphAtoms, graphLook, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      await test.step('AND the high contrast theme applies', async (): Promise<void> => graphLook.applyTheme(THEME_HC_STUB));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND the first ten files are drawn', async (): Promise<void> => graphAtomCap.expectDrawnOf(FILE_IDS, FIRST_TEN));

      await test.step('AND atoms arrive with the 150th file failed', async (): Promise<void> =>
        graphTaskHost.sendAtoms(FAILED_GROUPS));

      await test.step('THEN the failed file is drawn with the failed outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(FAILED_FILE, FAILED_OUTCOME));

      await test.step('AND the tenth file is gone', async (): Promise<void> => graphAtomCap.expectDrawnOf(FILE_IDS, CAPPED_DRAWN));
    }
  );
});
