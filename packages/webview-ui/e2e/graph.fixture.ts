import { test as base } from '@playwright/test';

import { GraphCamera } from './pages/graph-camera.po.ts';
import { GraphCanvas } from './pages/graph-canvas.po.ts';
import { GraphControlsKeys } from './pages/graph-controls-keys.po.ts';
import { GraphControlsPage } from './pages/graph-controls.po.ts';
import { GraphDetailsLink } from './pages/graph-details-link.po.ts';
import { GraphDetailsTrace } from './pages/graph-details-trace.po.ts';
import { GraphDetailsPage } from './pages/graph-details.po.ts';
import { GraphExplainHost } from './pages/graph-explain-host.po.ts';
import { GraphHost } from './pages/graph-host.po.ts';
import { GraphIcons } from './pages/graph-icons.po.ts';
import { GraphLook } from './pages/graph-look.po.ts';
import { GraphPackageList } from './pages/graph-package-list.po.ts';
import { GraphProbePage } from './pages/graph-probe.po.ts';
import { GraphSamples } from './pages/graph-samples.po.ts';
import { GraphToolbar } from './pages/graph-toolbar.po.ts';
import { GraphPage } from './pages/graph.po.ts';
import { PageClock } from './pages/page-clock.po.ts';

type GraphFixtures = {
  readonly graphCamera: GraphCamera;
  readonly graphCanvas: GraphCanvas;
  readonly graphControls: GraphControlsPage;
  readonly graphDetails: GraphDetailsPage;
  readonly graphHost: GraphHost;
  readonly graphIcons: GraphIcons;
  readonly graphKeys: GraphControlsKeys;
  readonly graphLink: GraphDetailsLink;
  readonly graphList: GraphPackageList;
  readonly graphLook: GraphLook;
  readonly graphPage: GraphPage;
  readonly graphProbe: GraphProbePage;
  readonly graphReplies: GraphExplainHost;
  readonly graphSamples: GraphSamples;
  readonly graphToolbar: GraphToolbar;
  readonly graphTrace: GraphDetailsTrace;
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
  graphDetails: async ({ page }, use): Promise<void> => {
    await use(new GraphDetailsPage(page));
  },
  graphHost: async ({ page }, use): Promise<void> => {
    await use(new GraphHost(page));
  },
  graphIcons: async ({ page }, use): Promise<void> => {
    await use(new GraphIcons(page));
  },
  graphKeys: async ({ page }, use): Promise<void> => {
    await use(new GraphControlsKeys(page));
  },
  graphLink: async ({ page }, use): Promise<void> => {
    await use(new GraphDetailsLink(page));
  },
  graphList: async ({ page }, use): Promise<void> => {
    await use(new GraphPackageList(page));
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
  graphReplies: async ({ page }, use): Promise<void> => {
    await use(new GraphExplainHost(page));
  },
  graphSamples: async ({ page }, use): Promise<void> => {
    await use(new GraphSamples(page));
  },
  graphToolbar: async ({ page }, use): Promise<void> => {
    await use(new GraphToolbar(page));
  },
  graphTrace: async ({ page }, use): Promise<void> => {
    await use(new GraphDetailsTrace(page));
  },
  pageClock: async ({ page }, use): Promise<void> => {
    await use(new PageClock(page));
  }
});

export { expect } from '@playwright/test';
