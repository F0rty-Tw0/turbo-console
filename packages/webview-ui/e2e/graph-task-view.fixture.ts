import { test as graphTaskBoxesTest } from './graph-task-boxes.fixture.ts';
import { GraphTaskView } from './pages/graph-task-view.po.ts';

type GraphTaskViewFixtures = {
  readonly graphTaskView: GraphTaskView;
};

/** The task box fixtures plus the task Controls View part. */
export const test = graphTaskBoxesTest.extend<GraphTaskViewFixtures>({
  graphTaskView: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskView(page));
  }
});

export { expect } from '@playwright/test';
