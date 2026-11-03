import { test as graphTaskTest } from './graph-task.fixture.ts';
import { GraphTaskBoxes } from './pages/graph-task-boxes.po.ts';

type GraphTaskBoxesFixtures = {
  readonly graphTaskBoxes: GraphTaskBoxes;
};

/** The task fixtures plus the task canvas boxes; `graph-task.fixture.ts` is at its line cap. */
export const test = graphTaskTest.extend<GraphTaskBoxesFixtures>({
  graphTaskBoxes: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskBoxes(page));
  }
});
