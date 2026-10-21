import { test as base } from '@playwright/test';

import { GraphCanvas } from './pages/graph-canvas.po.ts';
import { GraphHost } from './pages/graph-host.po.ts';
import { GraphLook } from './pages/graph-look.po.ts';
import { GraphProbePage } from './pages/graph-probe.po.ts';
import { GraphPage } from './pages/graph.po.ts';
import { PageClock } from './pages/page-clock.po.ts';

type GraphFixtures = {
  readonly graphCanvas: GraphCanvas;
  readonly graphHost: GraphHost;
  readonly graphLook: GraphLook;
  readonly graphPage: GraphPage;
  readonly graphProbe: GraphProbePage;
  readonly pageClock: PageClock;
};

export const test = base.extend<GraphFixtures>({
  graphCanvas: async ({ page }, use): Promise<void> => {
    await use(new GraphCanvas(page));
  },
  graphHost: async ({ page }, use): Promise<void> => {
    await use(new GraphHost(page));
  },
  graphLook: async ({ page }, use): Promise<void> => {
    await use(new GraphLook(page));
  },
  graphPage: async ({ page }, use): Promise<void> => {
    await use(new GraphPage(page));
  },
  graphProbe: async ({ page }, use): Promise<void> => {
    await use(new GraphProbePage(page));
  },
  pageClock: async ({ page }, use): Promise<void> => {
    await use(new PageClock(page));
  }
});
