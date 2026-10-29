import { test as base } from './graph-task.fixture.ts';
import { GraphTaskToolbar } from './pages/graph-task-toolbar.po.ts';

type GraphToolbarFixtures = {
  readonly graphTaskToolbar: GraphTaskToolbar;
};

export { expect } from './graph-task.fixture.ts';

export const test = base.extend<GraphToolbarFixtures>({
  graphTaskToolbar: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskToolbar(page));
  }
});
