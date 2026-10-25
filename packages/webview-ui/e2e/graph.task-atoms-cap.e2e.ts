import { test } from './graph-task.fixture.ts';
import { THEME_HC_STUB } from './test/stubs/graph-theme.stub.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeFileIds } from './test/utils/graph-target-like-tasks.spec.util.ts';
import type { GraphAtomGroupState } from '../src/bridge/common/graph-message.type.ts';
import { ATOM_BOX_PADDING_PX, ATOM_FILE_SIZE, ATOM_GRID_GAP_PX, ATOM_MORE_PREFIX } from '../src/graph/common/graph-atom.const.ts';

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

/** Every node an expanded group may draw besides its box. */
const ATOM_NODE_IDS = [...FILE_IDS, MORE_ID];

/** The ten files and the count node make 11 slots: 4 columns and 3 rows. */
const COLUMNS = 4;

const ROWS = 3;

const GRID_WIDTH = COLUMNS * ATOM_FILE_SIZE.width + (COLUMNS - 1) * ATOM_GRID_GAP_PX;

const GRID_HEIGHT = ROWS * ATOM_FILE_SIZE.height + (ROWS - 1) * ATOM_GRID_GAP_PX;

const BOX_WIDTH = GRID_WIDTH + 2 * ATOM_BOX_PADDING_PX;

/** What the box adds under the umbrella: the gap, the rows of the grid and the padding on both sides. */
const BOX_EXTRA_HEIGHT = ATOM_GRID_GAP_PX + GRID_HEIGHT + 2 * ATOM_BOX_PADDING_PX;

/** The high contrast stub's failed colour as Cytoscape reports it. */
const FAILED_OUTCOME = { width: 2, colour: 'rgb(244, 135, 113)' };

const FAILED_FILES = { [FAILED_FILE]: 'failed' } as const;

const FAILED_STATE: GraphAtomGroupState = { counts: '200 files · 1 failed', files: FAILED_FILES };

const FAILED_GROUPS = { [TARGET_LIKE_UMBRELLA]: FAILED_STATE };

test.describe('FEATURE: graph task mode with a capped Atomizer group', () => {
  test(
    'GIVEN the umbrella chosen with the target-like state of 200 files sent, atoms with the 150th file failed and a double tap on the umbrella draw the failed file and the first nine, then a count node of the other 190',
    { annotation: CAP_SPEC },
    async ({ graphAtomCap, graphAtoms, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      await test.step('AND atoms arrive with the 150th file failed', async (): Promise<void> =>
        graphTaskHost.sendAtoms(FAILED_GROUPS));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN exactly the failed file and the first nine are drawn', async (): Promise<void> =>
        graphAtomCap.expectDrawnOf(FILE_IDS, CAPPED_DRAWN));

      await test.step('AND the count node reads 190 more', async (): Promise<void> => graphTaskProbe.expectText(MORE_ID, MORE_TEXT));
    }
  );

  test(
    'GIVEN the umbrella chosen with the target-like state of 200 files sent, a double tap on the umbrella opens a box at its top left that is 4 columns by 3 rows of files',
    { annotation: CAP_SPEC },
    async ({ graphAtoms, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      const umbrella = await graphAtoms.nodeOf(TARGET_LIKE_UMBRELLA);

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the box is 4 columns wide and the umbrella plus 3 rows of files tall', async (): Promise<void> => {
        return graphAtoms.expectBox(TARGET_LIKE_UMBRELLA, {
          x: umbrella.x - umbrella.width / 2,
          y: umbrella.y - umbrella.height / 2,
          width: BOX_WIDTH,
          height: umbrella.height + BOX_EXTRA_HEIGHT
        });
      });
    }
  );

  test(
    'GIVEN the umbrella chosen with the target-like state of 200 files sent, a double tap on the umbrella and then on its count node removes the box, the files and the count node and puts every node back',
    { annotation: CAP_SPEC },
    async ({ graphAtomCap, graphAtoms, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      const before = await graphTaskProbe.taskPositions();

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the count node is drawn', async (): Promise<void> => graphTaskProbe.expectText(MORE_ID, MORE_TEXT));

      await test.step('WHEN the count node is double tapped', async (): Promise<void> => graphAtoms.toggle(MORE_ID));

      await test.step('THEN the box is gone', async (): Promise<void> => graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, false));

      await test.step('AND no file and no count node is drawn', async (): Promise<void> =>
        graphAtomCap.expectDrawnOf(ATOM_NODE_IDS, []));

      await test.step('AND every node is where it was', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );

  test(
    'GIVEN the umbrella chosen with the target-like state of 200 files sent, atoms with the 150th file failed swap the failed file in for the tenth file of the expanded group with the failed outline and move no node',
    { annotation: CAP_SPEC },
    async ({ graphAtomCap, graphAtoms, graphLook, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      await test.step('AND the high contrast theme applies', async (): Promise<void> => graphLook.applyTheme(THEME_HC_STUB));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the first ten files are drawn', async (): Promise<void> =>
        graphAtomCap.expectDrawnOf(FILE_IDS, FIRST_TEN));

      const before = await graphTaskProbe.taskPositions();

      await test.step('WHEN atoms arrive with the 150th file failed', async (): Promise<void> =>
        graphTaskHost.sendAtoms(FAILED_GROUPS));

      await test.step('THEN the failed file is drawn with the failed outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(FAILED_FILE, FAILED_OUTCOME));

      await test.step('AND the tenth file is gone', async (): Promise<void> => graphAtomCap.expectDrawnOf(FILE_IDS, CAPPED_DRAWN));

      await test.step('AND no node but the files and the count node moved', async (): Promise<void> =>
        graphAtomCap.expectNodesStayed(before, ATOM_NODE_IDS));
    }
  );

  test(
    'GIVEN the umbrella chosen with the target-like state of 200 files sent, a double tap on the umbrella after atoms with the 150th file failed redrew its group removes the box, the files and the count node and puts every node back',
    { annotation: CAP_SPEC },
    async ({ graphAtomCap, graphAtoms, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella(FILE_COUNT));

      const before = await graphTaskProbe.taskPositions();

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND atoms arrive with the 150th file failed', async (): Promise<void> =>
        graphTaskHost.sendAtoms(FAILED_GROUPS));

      await test.step('THEN exactly the failed file and the first nine are drawn', async (): Promise<void> =>
        graphAtomCap.expectDrawnOf(FILE_IDS, CAPPED_DRAWN));

      await test.step('WHEN the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the box is gone', async (): Promise<void> => graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, false));

      await test.step('AND no file and no count node is drawn', async (): Promise<void> =>
        graphAtomCap.expectDrawnOf(ATOM_NODE_IDS, []));

      await test.step('AND every node is where it was', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );
});
