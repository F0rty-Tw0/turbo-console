import { test as graphTaskTest } from './graph-task.fixture.ts';
import { GraphAtomChips } from './pages/graph-atom-chips.po.ts';

type GraphAtomChipsFixtures = {
  readonly graphAtomChips: GraphAtomChips;
};

/** The task fixtures plus the umbrella chip rows; `graph-task.fixture.ts` is at its line cap. */
export const test = graphTaskTest.extend<GraphAtomChipsFixtures>({
  graphAtomChips: async ({ page }, use): Promise<void> => {
    await use(new GraphAtomChips(page));
  }
});
