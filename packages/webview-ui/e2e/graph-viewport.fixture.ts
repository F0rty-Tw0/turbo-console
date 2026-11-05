import { test as graphTaskTest } from './graph-task.fixture.ts';
import { PageViewport } from './pages/page-viewport.po.ts';

type GraphViewportFixtures = {
  readonly pageViewport: PageViewport;
};

/** The task fixtures plus the page's viewport; `graph-task.fixture.ts` is at its line cap. */
export const test = graphTaskTest.extend<GraphViewportFixtures>({
  pageViewport: async ({ page }, use): Promise<void> => {
    await use(new PageViewport(page));
  }
});
