import { test as graphTest } from './graph.fixture.ts';
import { GraphFlowPage } from './pages/graph-flow.po.ts';
import { GraphHover } from './pages/graph-hover.po.ts';
import { GraphTaskDetails } from './pages/graph-task-details.po.ts';
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

/** Opens the page in task mode with the target-like state sent and its Atomizer umbrella chosen and drawn. */
type OpenUmbrella = () => Promise<void>;

type GraphTaskFixtures = {
  readonly graphFlow: GraphFlowPage;
  readonly graphHover: GraphHover;
  readonly graphTask: GraphTask;
  readonly graphTaskDetails: GraphTaskDetails;
  readonly graphTaskNarrow: GraphTaskNarrow;
  readonly openUmbrella: OpenUmbrella;
};

/** The graph fixtures plus task mode's page parts; `graph.fixture.ts` is at its line cap. */
export const test = graphTest.extend<GraphTaskFixtures>({
  graphFlow: async ({ page }, use): Promise<void> => {
    await use(new GraphFlowPage(page));
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
  openUmbrella: async ({ graphHost, graphPage, graphTaskProbe }, use): Promise<void> => {
    const open = async (): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, { chosen: [TARGET_LIKE_UMBRELLA] }) });
      await graphHost.sendState(targetLikeTasksState());
      await graphTaskProbe.expectTaskIds(UMBRELLA_SHOWN);
    };

    await use(open);
  }
});

export { expect } from '@playwright/test';
