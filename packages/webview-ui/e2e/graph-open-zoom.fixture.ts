import { test as graphTaskTest } from './graph-task.fixture.ts';
import { GraphOpenZoom } from './pages/graph-open-zoom.po.ts';

type GraphOpenZoomFixtures = {
  readonly graphOpenZoom: GraphOpenZoom;
};

/** The task fixtures plus the opening zoom floor. */
export const test = graphTaskTest.extend<GraphOpenZoomFixtures>({
  graphOpenZoom: async ({ page }, use): Promise<void> => {
    await use(new GraphOpenZoom(page));
  }
});
