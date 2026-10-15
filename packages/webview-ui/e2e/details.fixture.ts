import { test as base } from '@playwright/test';

import { DetailsPage } from './pages/details.po.ts';

type DetailsFixtures = {
  readonly detailsPage: DetailsPage;
};

export { expect } from '@playwright/test';

export const test = base.extend<DetailsFixtures>({
  detailsPage: async ({ page }, use): Promise<void> => {
    await use(new DetailsPage(page));
  }
});
