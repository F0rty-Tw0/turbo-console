import type { Browser } from '@playwright/test';
import { expect } from '@playwright/test';

import { withSession } from './bench-session.ts';
import type { BenchSession } from './common/bench.type.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { largeState } from '../test/utils/graph-large.spec.util.ts';
import { groupedSavedState } from '../test/utils/graph-saved-state.spec.util.ts';

const GROUP_COUNT = 30;
const BOX_WIDTH_PX = 120;

/** After Fit and the zoom to 120 px boxes, 9 of the 30 boxes overlap the canvas; 6 leaves slack. */
const BOXES_IN_VIEW = 6;

const WARM_UP_FRAMES = 30;
const PAN_FRAMES = 120;
const TOGGLED_FOLDER = 'group-2';

export const largeGroupedOptions = (): GraphOptions => {
  const options: GraphOptions = { savedState: groupedSavedState(largeState().hash) };

  return options;
};

/** The 300-package state laid out by ELK in 30 folders, framed by Fit and zoomed to readable boxes. */
const framedGrouped = async (session: BenchSession): Promise<void> => {
  const { canvas, graphPage, grouping, host, probe } = session;

  await host.sendState(largeState());
  await probe.expectLayoutEngine('elk');
  await grouping.expectFolderCount(GROUP_COUNT);
  await graphPage.pressButton(FIT_LABEL);
  await canvas.expectAllNodesInView();
  await grouping.zoomBoxesTo(BOX_WIDTH_PX);
  await grouping.expectBoxesAtLeast(BOX_WIDTH_PX);
  await grouping.expectBoxesInView(BOXES_IN_VIEW);
};

const pannedCpu = async (session: BenchSession): Promise<number> => {
  const { canvas, grouping } = session;

  await framedGrouped(session);

  const spot = await grouping.freeSpot();

  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES, spot);

  const cpu = canvas.lastPanCpu();

  if (cpu === null) throw new Error('bench: the scripted pan recorded no CPU');

  return cpu.totalMs;
};

const toggledMs = async (session: BenchSession): Promise<number> => {
  const { folders, timings } = session;

  await framedGrouped(session);
  await folders.expectFoldersInView([TOGGLED_FOLDER]);
  await folders.toggleInList(TOGGLED_FOLDER, true);

  await expect.poll(async (): Promise<number | null> => timings.toggleMs()).not.toBeNull();

  const ms = await timings.toggleMs();

  if (ms === null) throw new Error('bench: the folder toggle was not measured');

  return ms;
};

/** Main-thread CPU of a scripted 2 s pan over the grouped 300-package graph. */
export const largeGroupedPan = async (browser: Browser): Promise<number> => withSession(browser, largeGroupedOptions(), pannedCpu);

/** One folder collapsed once through its list button; the probe's `toggleMs`. */
export const largeToggleMs = async (browser: Browser): Promise<number> => withSession(browser, largeGroupedOptions(), toggledMs);
