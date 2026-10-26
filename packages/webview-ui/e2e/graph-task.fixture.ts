import { test as graphTest } from './graph.fixture.ts';
import { GraphAtomCap } from './pages/graph-atom-cap.po.ts';
import { GraphAtoms } from './pages/graph-atoms.po.ts';
import { GraphFlowPage } from './pages/graph-flow.po.ts';
import { GraphHover } from './pages/graph-hover.po.ts';
import { GraphTaskDetails } from './pages/graph-task-details.po.ts';
import { GraphTaskGlyphs } from './pages/graph-task-glyphs.po.ts';
import { GraphTaskNarrow } from './pages/graph-task-narrow.po.ts';
import { GraphTask } from './pages/graph-task.po.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const TARGET_LIKE_HASH = '7a7a7a7b';

/** The umbrella and every `build` it needs, directly or not; nothing needs the umbrella. */
const UMBRELLA_SHOWN = [
  TARGET_LIKE_UMBRELLA,
  'feat-1#build',
  'feat-2#build',
  'hub#build',
  'lib-1#build',
  'lib-2#build',
  'lib-3#build',
  'util-a#build',
  'util-b#build'
];

/** Opens the page in task mode with the target-like state of `fileCount` files sent and its Atomizer umbrella chosen and drawn. */
type OpenUmbrella = (fileCount?: number) => Promise<void>;

type GraphTaskFixtures = {
  readonly graphAtomCap: GraphAtomCap;
  readonly graphAtoms: GraphAtoms;
  readonly graphFlow: GraphFlowPage;
  readonly graphGlyphs: GraphTaskGlyphs;
  readonly graphHover: GraphHover;
  readonly graphTask: GraphTask;
  readonly graphTaskDetails: GraphTaskDetails;
  readonly graphTaskNarrow: GraphTaskNarrow;
  /** The same graph page in a second tab of the context, for a comparison against `graphGlyphs`. */
  readonly secondGlyphs: GraphTaskGlyphs;
  readonly openUmbrella: OpenUmbrella;
};

/** The graph fixtures plus task mode's page parts; `graph.fixture.ts` is at its line cap. */
export const test = graphTest.extend<GraphTaskFixtures>({
  graphAtomCap: async ({ page }, use): Promise<void> => {
    await use(new GraphAtomCap(page));
  },
  graphAtoms: async ({ page }, use): Promise<void> => {
    await use(new GraphAtoms(page));
  },
  graphFlow: async ({ page }, use): Promise<void> => {
    await use(new GraphFlowPage(page));
  },
  graphGlyphs: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskGlyphs(page));
  },
  graphHover: async ({ page }, use): Promise<void> => {
    await use(new GraphHover(page));
  },
  graphTask: async ({ page }, use): Promise<void> => {
    await use(new GraphTask(page));
  },
  graphTaskDetails: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskDetails(page));
  },
  graphTaskNarrow: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskNarrow(page));
  },
  secondGlyphs: async ({ context }, use): Promise<void> => {
    const second = await context.newPage();

    await use(new GraphTaskGlyphs(second));
  },
  openUmbrella: async ({ graphHost, graphPage, graphTaskProbe }, use): Promise<void> => {
    const open = async (fileCount?: number): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, { chosen: [TARGET_LIKE_UMBRELLA] }) });
      await graphHost.sendState(targetLikeTasksState(fileCount));
      await graphTaskProbe.expectTaskIds(UMBRELLA_SHOWN);
    };

    await use(open);
  }
});

export { expect } from '@playwright/test';
