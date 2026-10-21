import { test as base } from '@playwright/test';

import { GraphSmokePage } from './pages/graph-smoke.po.ts';

type GraphSmokeFixtures = {
  readonly graphPage: GraphSmokePage;
};

export const test = base.extend<GraphSmokeFixtures>({
  graphPage: async ({ page }, use): Promise<void> => {
    await use(new GraphSmokePage(page));
  }
});
