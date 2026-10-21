import { test as base } from '@playwright/test';

import { DetailsPage } from './pages/details.po.ts';
import { PageClock } from './pages/page-clock.po.ts';
import { PageLayout } from './pages/page-layout.po.ts';
import { PageViewport } from './pages/page-viewport.po.ts';

type DetailsFixtures = {
  readonly detailsPage: DetailsPage;
  readonly pageClock: PageClock;
  readonly pageLayout: PageLayout;
  readonly pageViewport: PageViewport;
};

export { expect } from '@playwright/test';

export const test = base.extend<DetailsFixtures>({
  detailsPage: async ({ page }, use): Promise<void> => {
    await use(new DetailsPage(page));
  },
  pageClock: async ({ page }, use): Promise<void> => {
    await use(new PageClock(page));
  },
  pageLayout: async ({ page }, use): Promise<void> => {
    await use(new PageLayout(page));
  },
  pageViewport: async ({ page }, use): Promise<void> => {
    await use(new PageViewport(page));
  }
});
