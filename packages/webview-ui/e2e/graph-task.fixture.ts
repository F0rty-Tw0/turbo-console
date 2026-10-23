import { test as graphTest } from './graph.fixture.ts';
import { GraphTaskDetails } from './pages/graph-task-details.po.ts';
import { GraphTaskNarrow } from './pages/graph-task-narrow.po.ts';
import { GraphTask } from './pages/graph-task.po.ts';

type GraphTaskFixtures = {
  readonly graphTask: GraphTask;
  readonly graphTaskDetails: GraphTaskDetails;
  readonly graphTaskNarrow: GraphTaskNarrow;
};

/** The graph fixtures plus task mode's page parts; `graph.fixture.ts` is at its line cap. */
export const test = graphTest.extend<GraphTaskFixtures>({
  graphTask: async ({ page }, use): Promise<void> => {
    await use(new GraphTask(page));
  },
  graphTaskDetails: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskDetails(page));
  },
  graphTaskNarrow: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskNarrow(page));
  }
});

export { expect } from '@playwright/test';
