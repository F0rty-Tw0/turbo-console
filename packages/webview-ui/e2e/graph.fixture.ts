import { test as base } from '@playwright/test';

import { GraphCamera } from './pages/graph-camera.po.ts';
import { GraphCanvas } from './pages/graph-canvas.po.ts';
import { GraphControlsPage } from './pages/graph-controls.po.ts';
import { GraphHost } from './pages/graph-host.po.ts';
import { GraphLook } from './pages/graph-look.po.ts';
import { GraphProbePage } from './pages/graph-probe.po.ts';
import { GraphPage } from './pages/graph.po.ts';
import { PageClock } from './pages/page-clock.po.ts';

type GraphFixtures = {
  readonly graphCamera: GraphCamera;
  readonly graphCanvas: GraphCanvas;
  readonly graphControls: GraphControlsPage;
  readonly graphHost: GraphHost;
  readonly graphLook: GraphLook;
  readonly graphPage: GraphPage;
  readonly graphProbe: GraphProbePage;
  readonly pageClock: PageClock;
};

export const test = base.extend<GraphFixtures>({
  graphCamera: async ({ page }, use): Promise<void> => {
    await use(new GraphCamera(page));
  },
  graphCanvas: async ({ page }, use): Promise<void> => {
    await use(new GraphCanvas(page));
  },
  graphControls: async ({ page }, use): Promise<void> => {
    await use(new GraphControlsPage(page));
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
