import { test as base } from './graph.fixture.ts';
import { GraphRoutes } from './pages/graph-routes.po.ts';

type GraphRoutesFixtures = {
  readonly graphRoutes: GraphRoutes;
};

/** The graph fixtures plus the posted edge routes. */
export const test = base.extend<GraphRoutesFixtures>({
  graphRoutes: async ({ page }, use): Promise<void> => {
    await use(new GraphRoutes(page));
  }
});
