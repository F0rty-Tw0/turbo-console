import type { Mocked } from 'vitest';

import type { LayoutRuns } from './graph-layouts.type.ts';
import type { WebviewMessage } from '../../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';
import type { FrameClock } from '../../common/frame-clock.type.ts';
import type { LayoutScreen } from '../../common/graph-layouts.type.ts';
import type { TaskModeDeps, TaskModes, TaskView } from '../../common/graph-task.type.ts';
import type { TaskCanvas } from '../../common/task-canvas.type.ts';

type MockedCanvas = { readonly tasks: Mocked<TaskCanvas> };

/** The task canvas and camera of a task mode under test, every call a spy. */
export type TaskViewMock = Mocked<TaskView> & MockedCanvas;

/** The deps of a `GraphTaskMode` under test and the doubles behind them. */
export type TaskModeRig = {
  readonly deps: TaskModeDeps;
  readonly view: TaskViewMock;
  readonly runs: LayoutRuns;
  readonly screen: Mocked<LayoutScreen>;
  readonly frames: Mocked<Pick<FrameClock, 'start' | 'arm'>>;
  /** The spec's modes, a real `ViewStateModes` over a saver spy. */
  readonly modes: TaskModes;
  /** Every message posted to the host so far, in order. */
  readonly posts: () => (WebviewMessage | GraphWebviewMessage)[];
  /** The order of the canvas, camera and frame calls so far. */
  readonly calls: () => string[];
};
