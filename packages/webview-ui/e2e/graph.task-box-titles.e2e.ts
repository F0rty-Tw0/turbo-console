import type { RunOutline } from './common/graph.type.ts';
import { test } from './graph-task.fixture.ts';
import { GraphBoxTitles } from './pages/graph-box-titles.po.ts';
import { buildOnlyStretchState, repoGenLikeTasksState } from './test/utils/graph-box-titles.spec.util.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeFileIds, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphReady, GraphTask } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const SPEC_3_4 = { description: 'M5-2 spec 3.4', type: 'requirement' };

/** The box of the target-like umbrella `app-1#e2e-ci`, its one task: a titled-row box. */
const UMBRELLA_BOX = 'pkg:app-1';

const FILE_IDS = targetLikeFileIds();

/** A running task's 2 px outline in the default theme stub, as Cytoscape reports it. */
const RUNNING_OUTLINE: RunOutline = { width: 2, colour: 'rgb(191,136,3)' };

/**
 * A task state the titles are checked on: `isLarge` for the 280 and 300 task states, whose layout runs 3-5x slower on
 * the Windows and macOS runners; `mustFrame` where it holds one-task (titled-row) boxes, so at least one box must be
 * drawn on its ELK frame.
 */
type TitleRow = {
  readonly name: string;
  readonly state: () => GraphReady;
  readonly isLarge: boolean;
  readonly mustFrame: boolean;
};

const ROWS: TitleRow[] = [
  { name: 'repo-gen-like', state: repoGenLikeTasksState, isLarge: true, mustFrame: true },
  { name: 'stretch build-only', state: buildOnlyStretchState, isLarge: true, mustFrame: true },
  { name: 'target-like', state: (): GraphReady => targetLikeTasksState(), isLarge: false, mustFrame: false }
];

const LAYOUTS = [
  { name: 'flat', isGrouped: false },
  { name: 'grouped', isGrouped: true }
];

const idOf = (task: GraphTask): string => task.id;

const packageNameOf = (task: GraphTask): string => task.packageName;

/** One package box title per package with a shown task. */
const titleCountOf = (state: GraphReady): number => new Set(state.tasks.map(packageNameOf)).size;

/** A saved task view of `state` with every task chosen, the cap lifted, grouped or flat. */
const everyTaskSaved = (state: GraphReady, isGrouped: boolean): GraphViewState => {
  const saved = taskSavedState(state.hash, { chosen: state.tasks.map(idOf), capLifted: true });
  const view: GraphViewState = { ...saved, grouped: isGrouped };

  return view;
};

test.describe('FEATURE: task box titles clear of lines', () => {
  for (const row of ROWS)
    for (const layout of LAYOUTS)
      test(`GIVEN the ${row.name} tasks ${layout.name} with every task chosen, no drawn line crosses a package box title`, async ({
        graphHost,
        graphPage,
        graphProbe,
        graphTaskProbe,
        page
      }): Promise<void> => {
        test.slow(row.isLarge, 'a 280 or 300 task ELK layout');

        const state = row.state();
        const graphBoxTitles = new GraphBoxTitles(page);

        await test.step(`WHEN the page opens ${layout.name} with every task chosen and the cap lifted`, async (): Promise<void> =>
          graphPage.open({ savedState: everyTaskSaved(state, layout.isGrouped) }));

        await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(state));

        await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

        await test.step('AND every task is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(state.tasks.map(idOf)));

        await test.step('THEN no drawn line crosses a package box title', async (): Promise<void> =>
          graphBoxTitles.expectNoTitleCrossed(titleCountOf(state)));

        await test.step('AND each framed box is drawn on its ELK frame, its title at the placeholder', async (): Promise<void> =>
          graphBoxTitles.expectFramesTrue(row.mustFrame));
      });

  test(
    'GIVEN the target-like umbrella alone in its framed box, an expanded umbrella draws its box from the files under its title and a collapse frames it again',
    { annotation: SPEC_3_4 },
    async ({ graphAtoms, openUmbrella, page }): Promise<void> => {
      const graphBoxTitles = new GraphBoxTitles(page);

      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the umbrella box is framed', async (): Promise<void> => graphBoxTitles.expectFramed(UMBRELLA_BOX, true));

      const { modelBox } = await test.step('AND the umbrella box is read', async () => graphBoxTitles.titleOf(UMBRELLA_BOX));

      await test.step('AND the umbrella is double tapped', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND its files are drawn', async (): Promise<void> => graphAtoms.expectFilesDrawn(FILE_IDS, true));

      await test.step('THEN the umbrella box is not framed', async (): Promise<void> =>
        graphBoxTitles.expectFramed(UMBRELLA_BOX, false));

      await test.step('AND its title sits in its top padding band', async (): Promise<void> =>
        graphBoxTitles.expectTitleInTopBand(UMBRELLA_BOX));

      await test.step('AND its title meets no drawn node but its own box', async (): Promise<void> =>
        graphBoxTitles.expectTitleClearOfNodes(UMBRELLA_BOX));

      await test.step('WHEN the umbrella is double tapped again', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('THEN the umbrella box is framed', async (): Promise<void> => graphBoxTitles.expectFramed(UMBRELLA_BOX, true));

      await test.step('AND it is drawn within 4 px of its box before the expand', async (): Promise<void> =>
        graphBoxTitles.expectModelBoxNear(UMBRELLA_BOX, modelBox));

      await test.step('AND it is drawn within 1 px of its ELK frame', async (): Promise<void> =>
        graphBoxTitles.expectOnFrame(UMBRELLA_BOX));

      await test.step('AND no drawn line crosses its title', async (): Promise<void> =>
        graphBoxTitles.expectTitleUncrossed(UMBRELLA_BOX));
    }
  );

  test(
    'GIVEN the target-like umbrella alone in its framed box, its run outline does not move the box off its frame, nor after an expand and collapse',
    { annotation: SPEC_3_4 },
    async ({ graphAtoms, graphTaskHost, graphTaskProbe, openUmbrella, page }): Promise<void> => {
      const graphBoxTitles = new GraphBoxTitles(page);

      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND the umbrella box is framed', async (): Promise<void> => graphBoxTitles.expectFramed(UMBRELLA_BOX, true));

      await test.step('AND the umbrella runs', async (): Promise<void> =>
        graphTaskHost.sendRuns({ [TARGET_LIKE_UMBRELLA]: 'running' }));

      await test.step('AND its run outline is drawn', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline(TARGET_LIKE_UMBRELLA, RUNNING_OUTLINE));

      await test.step('THEN its box is drawn within 1 px of its ELK frame', async (): Promise<void> =>
        graphBoxTitles.expectOnFrame(UMBRELLA_BOX));

      await test.step('WHEN the umbrella is expanded', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND its box is not framed', async (): Promise<void> => graphBoxTitles.expectFramed(UMBRELLA_BOX, false));

      await test.step('AND it is collapsed', async (): Promise<void> => graphAtoms.toggle(TARGET_LIKE_UMBRELLA));

      await test.step('AND its box is framed', async (): Promise<void> => graphBoxTitles.expectFramed(UMBRELLA_BOX, true));

      await test.step('THEN its box is drawn within 1 px of its ELK frame', async (): Promise<void> =>
        graphBoxTitles.expectOnFrame(UMBRELLA_BOX));
    }
  );
});
