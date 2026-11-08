import { test } from './graph-task.fixture.ts';
import { GraphBoxTitles } from './pages/graph-box-titles.po.ts';
import { buildOnlyStretchState, repoGenLikeTasksState } from './test/utils/graph-box-titles.spec.util.ts';
import { targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphReady, GraphTask } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

/**
 * A task state the titles are checked on: `isLarge` for the 280 and 300 task states, whose layout runs 3-5x slower on
 * the Windows and macOS runners; `CROSSED` while master draws lines through its titles. Slice B
 * (feat/g24a-title-slot, ELK title slots) moves these rows to `CLEAR`.
 */
type TitleRow = {
  readonly name: string;
  readonly state: () => GraphReady;
  readonly isLarge: boolean;
  readonly titles: TitleCheck;
};

/** What a row expects of its titles once laid out, and the check that proves it given the title count. */
type TitleCheck = {
  readonly then: string;
  readonly expect: (titles: GraphBoxTitles, count: number) => Promise<void>;
};

/** Master draws lines through these titles. */
const CROSSED: TitleCheck = {
  then: 'drawn lines still cross package box titles',
  expect: async (titles, count): Promise<void> => titles.expectTitlesCrossed(count)
};

const CLEAR: TitleCheck = {
  then: 'no drawn line crosses a package box title',
  expect: async (titles, count): Promise<void> => titles.expectNoTitleCrossed(count)
};

const ROWS: TitleRow[] = [
  { name: 'repo-gen-like', state: repoGenLikeTasksState, isLarge: true, titles: CROSSED },
  { name: 'stretch build-only', state: buildOnlyStretchState, isLarge: true, titles: CROSSED },
  { name: 'target-like', state: (): GraphReady => targetLikeTasksState(), isLarge: false, titles: CLEAR }
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
      test(`GIVEN the ${row.name} tasks ${layout.name} with every task chosen, ${row.titles.then}`, async ({
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

        await test.step(`THEN ${row.titles.then}`, async (): Promise<void> => row.titles.expect(graphBoxTitles, titleCountOf(state)));
      });
});
