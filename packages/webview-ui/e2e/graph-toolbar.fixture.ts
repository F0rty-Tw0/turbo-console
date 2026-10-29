import { test as base } from './graph-task.fixture.ts';
import { GraphBundle } from './pages/graph-bundle.po.ts';
import { GraphTaskToolbar } from './pages/graph-task-toolbar.po.ts';

type GraphToolbarFixtures = {
  readonly graphBundle: GraphBundle;
  readonly graphTaskToolbar: GraphTaskToolbar;
};

export { expect } from './graph-task.fixture.ts';

export const test = base.extend<GraphToolbarFixtures>({
  graphBundle: async ({ page }, use): Promise<void> => {
    await use(new GraphBundle(page));
  },
  graphTaskToolbar: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskToolbar(page));
  }
});
