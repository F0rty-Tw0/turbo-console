import type { Browser } from '@playwright/test';

import { recordNote } from './bench-record.ts';
import { withSession } from './bench-session.ts';
import { PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession } from './common/bench.type.ts';
import { CONTROLS_LABEL, DETAILS_LABEL, FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { LARGE_LAYOUT_SETTLE_MS, LARGE_LAYOUT_TIMEOUT_MS } from '../common/large-layout.const.ts';
import { GraphTaskHost } from '../pages/graph-task-host.po.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { insideFlagsOf } from '../test/utils/graph-geometry.spec.util.ts';
import { layeredRunsOf, layeredTasksState } from '../test/utils/graph-layered-tasks.spec.util.ts';
import { taskSavedState } from '../test/utils/graph-task-saved.spec.util.ts';

/** The zoom at which a card reads: below it row 2 is too small to read. */
const READABLE_ZOOM = 0.8;

const WHEEL_NOTCH_PX = 100;

/** After Fit, 240 tasks in a 1280 x 720 page leave this many wholly in view. */
const MIN_FIT_TASKS = 200;

/** With Controls and Details closed, 20 cards lie wholly in view at the readable zoom. */
const MIN_READABLE_TASKS = 20;

const isTask = (id: string): boolean => id.includes('#');

const tasksInView = async (session: BenchSession): Promise<number> => {
  const { canvas, probe } = session;
  const container = await canvas.container.evaluate(readRect);
  const zoom = await probe.zoom();
  const nodes = await probe.nodes();
  const tasks = nodes.filter((node): boolean => isTask(node.id));
  const flags = insideFlagsOf(container, tasks, zoom);

  return flags.filter(Boolean).length;
};

const zoomedToReadable = async (session: BenchSession): Promise<void> => {
  const { canvas, graphPage, probe } = session;
  const isReached = async (): Promise<boolean> => {
    const zoom = await probe.zoom();

    return zoom >= READABLE_ZOOM;
  };

  await graphPage.pressButton(CONTROLS_LABEL);
  await graphPage.pressButton(DETAILS_LABEL);
  await canvas.zoomUntil(-WHEEL_NOTCH_PX, isReached);

  const readableCount = await tasksInView(session);

  if (readableCount < MIN_READABLE_TASKS)
    throw new Error(`bench: ${readableCount} task nodes in view at the readable zoom, want ${MIN_READABLE_TASKS}`);
};

const framedByFit = async (session: BenchSession, ids: string[]): Promise<void> => {
  const { canvas, graphPage, host, probe } = session;
  const taskHost = new GraphTaskHost(session.page);

  await host.sendState(layeredTasksState());
  await probe.expectLayoutEngine('elk', LARGE_LAYOUT_SETTLE_MS);
  await taskHost.sendRuns(layeredRunsOf(ids));
  await graphPage.pressButton(FIT_LABEL);
  await canvas.expectAllNodesInView();

  const fitCount = await tasksInView(session);

  if (fitCount < MIN_FIT_TASKS) throw new Error(`bench: Fit left ${fitCount} task nodes in view, want ${MIN_FIT_TASKS}`);
};

const pannedCpu = async (session: BenchSession, isReadable: boolean): Promise<number> => {
  const { canvas, probe } = session;
  const ids = layeredTasksState().tasks.map((task): string => task.id);

  await framedByFit(session, ids);

  if (isReadable) await zoomedToReadable(session);

  const zoom = await probe.zoom();

  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES);

  const cpu = canvas.measuredPanCpu();

  recordNote(`cards ${isReadable ? 'readable' : 'fit'} pan maxStep ${cpu.maxStepMs.toFixed(1)} ms zoom ${zoom.toFixed(3)}`);

  return cpu.totalMs;
};

/**
 * Main-thread CPU of a scripted 2 s pan over 240 run-marked tasks with all of them chosen, framed by Fit first; `isReadable`
 * then closes Controls and Details and wheels in to a zoom of 0.8 or more, where a card's rows read. Notes the costliest step
 * and the zoom beside the total, so two builds compare at the same zoom.
 */
export const taskCardsPan = async (browser: Browser, isReadable: boolean): Promise<number> => {
  const { hash, tasks } = layeredTasksState();
  const savedState = taskSavedState(hash, { chosen: tasks.map((task): string => task.id), capLifted: true });
  const options: GraphOptions = { savedState, layoutTimeoutMs: LARGE_LAYOUT_TIMEOUT_MS };
  const work = async (session: BenchSession): Promise<number> => pannedCpu(session, isReadable);

  return withSession(browser, options, work);
};
