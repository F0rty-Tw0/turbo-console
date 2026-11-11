import { test as graphTaskProjectsTest } from './graph-task-projects.fixture.ts';
import { GraphTaskAffected } from './pages/graph-task-affected.po.ts';

type GraphTaskAffectedFixtures = {
  readonly graphAffected: GraphTaskAffected;
};

/** The task fixtures and the Projects grid plus the affected part; `graph-task.fixture.ts` is at its line cap. */
export const test = graphTaskProjectsTest.extend<GraphTaskAffectedFixtures>({
  graphAffected: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskAffected(page));
  }
});
