import { test as graphTest } from './graph.fixture.ts';
import { GraphTask } from './pages/graph-task.po.ts';

type GraphTaskFixtures = {
  readonly graphTask: GraphTask;
};

/** The graph fixtures plus task mode's page parts; `graph.fixture.ts` is at its line cap. */
export const test = graphTest.extend<GraphTaskFixtures>({
  graphTask: async ({ page }, use): Promise<void> => {
    await use(new GraphTask(page));
  }
});

export { expect } from '@playwright/test';
