import type { Browser } from '@playwright/test';

import type { BenchSession } from './common/bench.type.ts';
import { PanRecorder } from './pan-recorder.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { GraphCanvas } from '../pages/graph-canvas.po.ts';
import { GraphFoldersPage } from '../pages/graph-folders.po.ts';
import { GraphGroupingPage } from '../pages/graph-grouping.po.ts';
import { GraphHost } from '../pages/graph-host.po.ts';
import { GraphProbePage } from '../pages/graph-probe.po.ts';
import { GraphTimings } from '../pages/graph-timings.po.ts';
import { GraphPage } from '../pages/graph.po.ts';

/** The Desktop Chrome size the tripwires use. */
const VIEWPORT = { width: 1280, height: 720 };

/** A fresh context and page with the pan recorder installed before the graph page opens; closed when `work` ends. */
export const withSession = async <T>(
  browser: Browser,
  options: GraphOptions,
  work: (session: BenchSession) => Promise<T>
): Promise<T> => {
  const context = await browser.newContext({ viewport: VIEWPORT });

  try {
    const page = await context.newPage();
    const recorder = new PanRecorder(page);
    const graphPage = new GraphPage(page);
    const session: BenchSession = {
      page,
      graphPage,
      host: new GraphHost(page),
      timings: new GraphTimings(page),
      probe: new GraphProbePage(page),
      canvas: new GraphCanvas(page),
      grouping: new GraphGroupingPage(page),
      folders: new GraphFoldersPage(page),
      recorder
    };

    await recorder.install();
    await graphPage.open(options);

    return await work(session);
  } finally {
    await context.close();
  }
};
