import type { Mock, Mocked } from 'vitest';

import type { LayoutRuns } from './graph-layouts.type.ts';
import type { WebviewMessage } from '../../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';
import type { FrameClock } from '../../common/frame-clock.type.ts';
import type { LayoutScreen } from '../../common/graph-layouts.type.ts';
import type { TaskModeDeps, TaskModes, TaskPanel, TaskView } from '../../common/graph-task.type.ts';
import type { TaskCanvas } from '../../common/task-canvas.type.ts';
import type { TaskControls } from '../../common/task-controls.type.ts';
import type { TaskDetails, TaskDetailsView, TaskDetailsViews } from '../../common/task-details.type.ts';

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
  readonly panel: Mocked<TaskPanel>;
  readonly controls: Mocked<TaskControls>;
  readonly details: Mocked<TaskDetails>;
  readonly onExit: Mock<() => void>;
  /** Called once by task mode with the panel's actions. */
  readonly panelOf: Mock<TaskModeDeps['panelOf']>;
  /** Called once by task mode with the Controls' actions. */
  readonly controlsOf: Mock<TaskModeDeps['controlsOf']>;
  /** Called once by task mode's selection with the task panel's actions. */
  readonly detailsOf: Mock<TaskModeDeps['detailsOf']>;
  /** Every message posted to the host so far, in order. */
  readonly posts: () => (WebviewMessage | GraphWebviewMessage)[];
  /** The order of the canvas, camera and frame calls so far. */
  readonly calls: () => string[];
};

/** The task panel, Controls and side panel doubles and the builders that hand them out. */
export type TaskPartsMock = Pick<TaskModeRig, 'panel' | 'controls' | 'details' | 'panelOf' | 'controlsOf' | 'detailsOf'>;

/** Real task details builders that record every view they build. */
export type TaskDetailsViewsMock = {
  readonly views: TaskDetailsViews;
  /** The one panel `views.panel` hands out. */
  readonly panel: HTMLElement;
  /** The views built so far, the latest last. */
  readonly built: TaskDetailsView[];
};
