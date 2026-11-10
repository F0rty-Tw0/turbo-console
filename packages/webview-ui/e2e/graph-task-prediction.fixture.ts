import { test as graphTaskTest } from './graph-task.fixture.ts';
import { GraphTaskPrediction } from './pages/graph-task-prediction.po.ts';

type GraphTaskPredictionFixtures = {
  readonly graphPrediction: GraphTaskPrediction;
};

/** The task fixtures plus the cache prediction part; `graph-task.fixture.ts` is at its line cap. */
export const test = graphTaskTest.extend<GraphTaskPredictionFixtures>({
  graphPrediction: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskPrediction(page));
  }
});
