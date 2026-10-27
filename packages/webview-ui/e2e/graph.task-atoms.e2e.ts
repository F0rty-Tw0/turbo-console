import { test } from './graph-task.fixture.ts';
import { THEME_HC_STUB } from './test/stubs/graph-theme.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeFileIds, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import type { GraphAtomGroupState } from '../src/bridge/common/graph-message.type.ts';
import type { Positions } from '../src/bridge/common/graph-state.type.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';
import type { ProbeNode } from '../src/graph/common/graph-probe.type.ts';
import type { NodeSize } from '../src/graph/common/node-size.type.ts';

const SPEC_3_3 = { description: 'M5-2 spec 3.3', type: 'requirement' };

const SPEC_3_5 = { description: 'M5-2 spec 3.5', type: 'requirement' };

const SPEC_3_4 = { description: 'M5-2 spec 3.4', type: 'requirement' };

const AC2 = { description: 'M5-2 AC2', type: 'requirement' };

const AC3 = { description: 'M5-2 AC3', type: 'requirement' };

const FILE_IDS = targetLikeFileIds();

const [LIVE_FILE = '', FAILED_FILE = '', CACHED_FILE = '', RUNNING_FILE = '', NO_OUTCOME_FILE = ''] = FILE_IDS;

const LIVE_SPEC_PATH = 'tests/spec-001.live.spec.ts';

const OUTCOME_FILES = { [LIVE_FILE]: 'passed', [FAILED_FILE]: 'failed', [CACHED_FILE]: 'cached' } as const;

const OUTCOME_STATE = { counts: '10 files · 1 cached · 1 failed', files: OUTCOME_FILES } as const;

const OUTCOME_GROUPS = { [TARGET_LIKE_UMBRELLA]: OUTCOME_STATE } as const;

/** The high contrast stub's failed, cached and passed colours as Cytoscape reports them. */
const FAILED_OUTCOME = { width: 2, colour: 'rgb(244, 135, 113)' };

const CACHED_OUTCOME = { width: 2, colour: 'rgb(177, 128, 215)' };

const PASSED_OUTCOME = { width: 2, colour: 'rgb(115, 201, 145)' };

/** The high contrast stub's `--vscode-charts-yellow`, the running outline. */
const RUNNING_OUTLINE = { width: 2, colour: 'rgb(255, 211, 112)' };

/** 10 files make 4 columns: (4 x 96 + 3 x 8) + 2 x 12 wide, and 3 rows: umbrella + 8 + (3 x 20 + 2 x 8) + 2 x 12 tall. */
const BOX_WIDTH = 432;

const BOX_EXTRA_HEIGHT = 108;

/** What the box adds to the umbrella it opens around: its width less the umbrella's, and the files' rows. */
const extraOf = (umbrella: ProbeNode): NodeSize => {
  const extra: NodeSize = { width: BOX_WIDTH - umbrella.width, height: BOX_EXTRA_HEIGHT };

  return extra;
};

const COLLAPSED_TEXT = `${GLYPH_CODE_POINTS.blank} e2e-ci\n10 files`;

const COUNTED_TEXT = `${GLYPH_CODE_POINTS.blank} e2e-ci\n10 files · 3 cached · 1 failed`;

const COUNTED: GraphAtomGroupState = { counts: '10 files · 3 cached · 1 failed', files: {} };

const COUNTED_GROUPS = { [TARGET_LIKE_UMBRELLA]: COUNTED };

const SKIPPED_FILES = { 'app-1#e2e-ci--tests/spec-002.spec.ts': 'skipped' };

const SKIPPED_STATE = { counts: '10 files · 9 cached', files: SKIPPED_FILES };

const SKIPPED_GROUPS = { [TARGET_LIKE_UMBRELLA]: SKIPPED_STATE };

const SHOWN_POST = [TARGET_LIKE_UMBRELLA];

const PACKAGE_NAMES = stateNamesOf(targetLikeTasksState());

test.describe('FEATURE: graph task mode with an Atomizer group', () => {
  test(
    'GIVEN the umbrella chosen and the target-like state sent, the umbrella shows its file count and the page reports the umbrella shown',
    { annotation: SPEC_3_3 },
    async ({ graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('THEN the umbrella text is its name over its file count', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COLLAPSED_TEXT));

      await test.step('AND the page posted shownUmbrellas with the umbrella', async (): Promise<void> =>
        graphTaskHost.expectShownUmbrellas([SHOWN_POST]));
    }
  );

  test(
    'GIVEN the umbrella chosen and the target-like state sent, atoms update the counts line and move no task node',
    { annotation: SPEC_3_3 },
    async ({ graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      const before = await test.step('AND the task positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      await test.step('AND atoms arrive with counts', async (): Promise<void> => graphTaskHost.sendAtoms(COUNTED_GROUPS));

      await test.step('THEN the umbrella text shows the counts', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COUNTED_TEXT));

      await test.step('AND no task node moved', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );

  test(
    'GIVEN the umbrella chosen and the target-like state sent, an atoms message with an outcome outside the four is dropped',
    { annotation: SPEC_3_5 },
    async ({ graphPage, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND a raw atoms message has the outcome skipped', async (): Promise<void> =>
        graphTaskHost.sendRaw({ type: 'atoms', groups: SKIPPED_GROUPS }));

      await test.step('THEN the umbrella text is unchanged', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COLLAPSED_TEXT));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN the umbrella chosen and the target-like state sent, the same state again reports the umbrella shown a second time and moves no task node',
    { annotation: SPEC_3_3 },
    async ({ graphHost, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      const before = await test.step('AND the task positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      await test.step('AND the same state is sent again', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

      await test.step('THEN the page posts shownUmbrellas with the umbrella a second time', async (): Promise<void> =>
        graphTaskHost.expectShownUmbrellas([SHOWN_POST, SHOWN_POST]));

      await test.step('AND no task node moved', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );

  test(
    'GIVEN the umbrella chosen and the target-like state sent, a double tap on the umbrella draws its ten files in a box at its top left and moves only the nodes right of or below it',
    { annotation: SPEC_3_4 },
    async ({ graphAtoms, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      const before = await test.step('AND the task positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      const umbrella = await test.step('AND the umbrella is read', async () => graphAtoms.nodeOf(TARGET_LIKE_UMBRELLA));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN its ten files are drawn', async (): Promise<void> => graphAtoms.expectFilesDrawn(FILE_IDS, true));

      await test.step('AND its box sits at the umbrella top left, 432 wide', async (): Promise<void> => {
        return graphAtoms.expectBox(TARGET_LIKE_UMBRELLA, {
          x: umbrella.x - umbrella.width / 2,
          y: umbrella.y - umbrella.height / 2,
          width: BOX_WIDTH,
          height: umbrella.height + BOX_EXTRA_HEIGHT
        });
      });

      await test.step('AND only the nodes right of or below the umbrella moved by the extra width and height of the box', async (): Promise<void> =>
        graphAtoms.expectNeighboursShifted(before, [TARGET_LIKE_UMBRELLA, ...FILE_IDS], umbrella, extraOf(umbrella)));
    }
  );

  test(
    'GIVEN the umbrella chosen and its group expanded, hovering a file shows its whole spec path as the canvas tooltip until the pointer leaves it',
    { annotation: SPEC_3_4 },
    async ({ graphAtoms, graphHover, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the group is expanded', async (): Promise<void> => {
        await graphAtoms.toggle(TARGET_LIKE_UMBRELLA);
        await graphAtoms.expectFilesDrawn(FILE_IDS, true);
      });

      await test.step('AND the live file is hovered', async (): Promise<void> => graphHover.overNode(LIVE_FILE));

      await test.step('THEN the canvas title is its spec path', async (): Promise<void> =>
        graphAtoms.expectCanvasTitle(LIVE_SPEC_PATH));

      await test.step('WHEN the empty canvas is hovered', async (): Promise<void> => graphHover.overBackground());

      await test.step('THEN the canvas has no title', async (): Promise<void> => graphAtoms.expectCanvasTitle(null));
    }
  );

  test(
    'GIVEN the umbrella chosen and a file hovered in its expanded group, the pointer leaving the canvas and coming back to that file shows its spec path again',
    { annotation: SPEC_3_4 },
    async ({ graphAtoms, graphHover, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the group is expanded', async (): Promise<void> => {
        await graphAtoms.toggle(TARGET_LIKE_UMBRELLA);
        await graphAtoms.expectFilesDrawn(FILE_IDS, true);
      });

      await test.step('AND the live file is hovered', async (): Promise<void> => graphHover.overNode(LIVE_FILE));

      await test.step('AND the pointer leaves the canvas', async (): Promise<void> => graphHover.leaveCanvas());

      await test.step('THEN the canvas has no title', async (): Promise<void> => graphAtoms.expectCanvasTitle(null));

      await test.step('WHEN the live file is hovered again', async (): Promise<void> => graphHover.overNode(LIVE_FILE));

      await test.step('THEN the canvas title is its spec path', async (): Promise<void> =>
        graphAtoms.expectCanvasTitle(LIVE_SPEC_PATH));
    }
  );

  test(
    'GIVEN the umbrella chosen and its group expanded, a second double tap removes the files and the box and puts every task node back',
    { annotation: AC2 },
    async ({ graphAtoms, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      const before = await test.step('AND the task positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND its files are drawn', async (): Promise<void> => graphAtoms.expectFilesDrawn(FILE_IDS, true));

      await test.step('AND the umbrella is double tapped again', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the files and the box are gone', async (): Promise<void> => {
        await graphAtoms.expectFilesDrawn(FILE_IDS, false);
        await graphAtoms.expectBoxDrawn(TARGET_LIKE_UMBRELLA, false);
      });

      await test.step('AND every task node is where it was', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );

  test(
    'GIVEN the umbrella chosen and atoms with a failed, a cached and a passed file, the expanded files take their outcome outlines, a file with no outcome none, and the live file a dashed border',
    { annotation: AC3 },
    async ({ graphAtoms, graphLook, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the high contrast theme applies', async (): Promise<void> => graphLook.applyTheme(THEME_HC_STUB));

      await test.step('AND atoms arrive with the outcomes', async (): Promise<void> => graphTaskHost.sendAtoms(OUTCOME_GROUPS));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the failed file has a 2 wide outline in the failed colour', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(FAILED_FILE, FAILED_OUTCOME));

      await test.step('AND the cached file has a 2 wide outline in the cached colour', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(CACHED_FILE, CACHED_OUTCOME));

      await test.step('AND the passed file has a 2 wide outline in the passed colour', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(LIVE_FILE, PASSED_OUTCOME));

      await test.step('AND a file with no outcome has no outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(NO_OUTCOME_FILE, null));

      await test.step('AND the live file has a dashed border and the others a solid one', async (): Promise<void> => {
        await graphAtoms.expectBorderStyle(LIVE_FILE, 'dashed');
        await graphAtoms.expectBorderStyle(CACHED_FILE, 'solid');
      });
    }
  );

  test(
    'GIVEN the umbrella chosen and its group collapsed, a file that runs before the group expands shows the running outline once it does',
    { annotation: AC3 },
    async ({ graphAtoms, graphLook, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the high contrast theme applies', async (): Promise<void> => graphLook.applyTheme(THEME_HC_STUB));

      await test.step('AND the group is expanded and collapsed', async (): Promise<void> => {
        await graphAtoms.toggle(TARGET_LIKE_UMBRELLA);
        await graphAtoms.expectFilesDrawn(FILE_IDS, true);
        await graphAtoms.toggle(TARGET_LIKE_UMBRELLA);
        await graphAtoms.expectFilesDrawn(FILE_IDS, false);
      });

      await test.step('AND a file runs', async (): Promise<void> => graphTaskHost.sendRuns({ [RUNNING_FILE]: 'running' }));

      await test.step('AND the group is expanded again', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the file has the running outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(RUNNING_FILE, RUNNING_OUTLINE));
    }
  );

  test(
    'GIVEN the umbrella chosen and its group expanded, dragging a task node moves no node',
    { annotation: SPEC_3_4 },
    async ({ graphAtoms, graphCanvas, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND its files are drawn', async (): Promise<void> => graphAtoms.expectFilesDrawn(FILE_IDS, true));

      const expanded = await test.step('AND the node positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      await test.step('AND a task node is dragged', async (): Promise<void> => graphCanvas.dragNode('feat-1#build', 60, 60));

      await test.step('THEN no node moved', async (): Promise<void> => graphTaskProbe.expectTaskPositions(expanded));
    }
  );

  test(
    'GIVEN the umbrella chosen and its group expanded, leaving task mode lets a package node be dragged',
    { annotation: SPEC_3_4 },
    async ({ graphAtoms, graphCanvas, graphProbe, graphTask, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND its files are drawn', async (): Promise<void> => graphAtoms.expectFilesDrawn(FILE_IDS, true));

      await test.step('AND Packages is pressed', async (): Promise<void> => graphTask.leave());

      await test.step('AND the package nodes are drawn', async (): Promise<void> => graphProbe.expectNodeIds(PACKAGE_NAMES));

      await test.step('AND a package node is dragged by 60 px right and 40 px down', async (): Promise<void> =>
        graphCanvas.dragNode('feat-1', 60, 40));

      await test.step('THEN the posted positions moved it by the drag', async (): Promise<void> => graphCanvas.expectDragPosted());
    }
  );
});
