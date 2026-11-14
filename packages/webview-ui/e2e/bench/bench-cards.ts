import type { Browser } from '@playwright/test';

import { recordNote } from './bench-record.ts';
import { withSession } from './bench-session.ts';
import { PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession } from './common/bench.type.ts';
import { CONTROLS_LABEL, DETAILS_LABEL, FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { LARGE_LAYOUT_SETTLE_MS, LARGE_LAYOUT_TIMEOUT_MS } from '../common/large-layout.const.ts';
import { GraphTaskClock } from '../pages/graph-task-clock.po.ts';
import { GraphTaskHost } from '../pages/graph-task-host.po.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { insideFlagsOf } from '../test/utils/graph-geometry.spec.util.ts';
import {
  layeredElapsedOf,
  layeredRunningRunsOf,
  layeredRunsOf,
  layeredTasksState
} from '../test/utils/graph-layered-tasks.spec.util.ts';
import { taskSavedState } from '../test/utils/graph-task-saved.spec.util.ts';

/** The zoom at which a card reads: below it row 2 is too small to read. */
const READABLE_ZOOM = 0.8;

const WHEEL_NOTCH_PX = 100;

/** After Fit, 240 tasks in a 1280 x 720 page leave this many wholly in view. */
const MIN_FIT_TASKS = 200;

/** With Controls and Details closed, 20 cards lie wholly in view at the readable zoom. */
const MIN_READABLE_TASKS = 20;

/** The start of a live card's row 2. */
const RUNNING_ROW_START = 'Running · ';

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

/** Row 2 of the first card, so a bench whose clocks never ran is caught: it would measure nothing. */
const rowTwoOfFirst = async (session: BenchSession, ids: string[]): Promise<string | null> => {
  const taskClock = new GraphTaskClock(session.page);

  return taskClock.rowTwoOf(ids[0] ?? '');
};

const expectClockTicked = (before: string | null, after: string | null): void => {
  const isLive = before?.startsWith(RUNNING_ROW_START) === true;

  if (!isLive || before === after) throw new Error('bench: the clock did not tick during the pan');
};

const sentRuns = async (session: BenchSession, ids: string[], isClocked: boolean): Promise<void> => {
  const taskClock = new GraphTaskClock(session.page);
  const taskHost = new GraphTaskHost(session.page);

  if (isClocked) return taskClock.sendRuns(layeredRunningRunsOf(ids), layeredElapsedOf(ids));

  await taskHost.sendRuns(layeredRunsOf(ids));
};

const framedByFit = async (session: BenchSession, ids: string[], isClocked: boolean): Promise<void> => {
  const { canvas, graphPage, host, probe } = session;

  await host.sendState(layeredTasksState());
  await probe.expectLayoutEngine('elk', LARGE_LAYOUT_SETTLE_MS);
  await sentRuns(session, ids, isClocked);
  await graphPage.pressButton(FIT_LABEL);
  await canvas.expectAllNodesInView();

  const fitCount = await tasksInView(session);

  if (fitCount < MIN_FIT_TASKS) throw new Error(`bench: Fit left ${fitCount} task nodes in view, want ${MIN_FIT_TASKS}`);
};

const labelOf = (isReadable: boolean, isClocked: boolean): string => {
  if (isClocked) return 'readable clocks';

  return isReadable ? 'readable' : 'fit';
};

const pannedCpu = async (session: BenchSession, isReadable: boolean, isClocked: boolean): Promise<number> => {
  const { canvas, probe } = session;
  const ids = layeredTasksState().tasks.map((task): string => task.id);

  await framedByFit(session, ids, isClocked);

  if (isReadable) await zoomedToReadable(session);

  const zoom = await probe.zoom();
  const before = await rowTwoOfFirst(session, ids);

  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES);

  const after = await rowTwoOfFirst(session, ids);

  if (isClocked) expectClockTicked(before, after);

  const cpu = canvas.measuredPanCpu();
  const label = labelOf(isReadable, isClocked);

  recordNote(`cards ${label} pan maxStep ${cpu.maxStepMs.toFixed(1)} ms zoom ${zoom.toFixed(3)}`);

  return cpu.totalMs;
};

/**
 * Main-thread CPU of a scripted 2 s pan over 240 run-marked tasks with all of them chosen, framed by Fit first; `isReadable`
 * then closes Controls and Details and wheels in to a zoom of 0.8 or more, where a card's rows read. Notes the costliest step
 * and the zoom beside the total, so two builds compare at the same zoom. `isClocked` marks every card running with its own
 * elapsed time, so each tick rewrites all 240 labels, and fails when no clock ticked during the pan.
 */
export const taskCardsPan = async (browser: Browser, isReadable: boolean, isClocked = false): Promise<number> => {
  const { hash, tasks } = layeredTasksState();
  const savedState = taskSavedState(hash, { chosen: tasks.map((task): string => task.id), capLifted: true });
  const options: GraphOptions = { savedState, layoutTimeoutMs: LARGE_LAYOUT_TIMEOUT_MS };
  const work = async (session: BenchSession): Promise<number> => pannedCpu(session, isReadable, isClocked);

  return withSession(browser, options, work);
};
