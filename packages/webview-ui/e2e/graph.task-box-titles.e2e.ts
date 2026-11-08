import { test } from './graph-task.fixture.ts';
import { GraphBoxTitles } from './pages/graph-box-titles.po.ts';
import { buildOnlyStretchState, repoGenLikeTasksState } from './test/utils/graph-box-titles.spec.util.ts';
import { targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphReady, GraphTask } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

/**
 * A task state the titles are checked on: `isLarge` for the 280 and 300 task states, whose layout runs 3-5x slower on
 * the Windows and macOS runners; `isCrossed` while master draws lines through its titles.
 */
type TitleRow = {
  readonly name: string;
  readonly state: () => GraphReady;
  readonly isLarge: boolean;
  readonly isCrossed: boolean;
};

const ROWS: TitleRow[] = [
  { name: 'repo-gen-like', state: repoGenLikeTasksState, isLarge: true, isCrossed: true },
  { name: 'stretch build-only', state: buildOnlyStretchState, isLarge: true, isCrossed: true },
  { name: 'target-like', state: (): GraphReady => targetLikeTasksState(), isLarge: false, isCrossed: false }
];

const LAYOUTS = [
  { name: 'flat', isGrouped: false },
  { name: 'grouped', isGrouped: true }
];

const idOf = (task: GraphTask): string => task.id;

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
        // Slice B (feat/g24a-title-slot, ELK title slots) flips these rows to passing.
        test.fail(row.isCrossed, 'master draws lines through these package box titles');

        const state = row.state();
        const graphBoxTitles = new GraphBoxTitles(page);

        await test.step(`WHEN the page opens ${layout.name} with every task chosen and the cap lifted`, async (): Promise<void> =>
          graphPage.open({ savedState: everyTaskSaved(state, layout.isGrouped) }));

        await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(state));

        await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

        await test.step('AND every task is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(state.tasks.map(idOf)));

        await test.step('THEN no drawn line crosses a package box title', async (): Promise<void> =>
          graphBoxTitles.expectNoTitleCrossed());
      });
});
