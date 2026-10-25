import type { Mock, Mocked } from 'vitest';

import type { LayoutRuns } from './graph-layouts.type.ts';
import type { WebviewMessage } from '../../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';
import type { FlowControl } from '../../common/flow.type.ts';
import type { FrameClock } from '../../common/frame-clock.type.ts';
import type { LayoutScreen } from '../../common/graph-layouts.type.ts';
import type { PageElements } from '../../common/graph-page.type.ts';
import type { TaskModeDeps, TaskModes, TaskPanel, TaskView } from '../../common/graph-task.type.ts';
import type { AtomCanvas, TaskCanvas } from '../../common/task-canvas.type.ts';
import type { TaskControls, TaskControlsElements, TaskControlsRow, TaskControlsViews } from '../../common/task-controls.type.ts';
import type { TaskDetails, TaskDetailsView, TaskDetailsViews } from '../../common/task-details.type.ts';
import type { MenuElements } from '../../common/widget-menu.type.ts';
import type { WidgetViews } from '../../common/widget.type.ts';

type MockedCanvas = { readonly tasks: Mocked<TaskCanvas>; readonly atoms: Mocked<AtomCanvas> };

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
  readonly onFailure: Mock<(error: unknown) => void>;
  /** The flow overlay; `deps.onHighlight` is its `highlightChanged`. */
  readonly flow: Mocked<FlowControl>;
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

/** Real task controls builders that record every row they build. */
export type TaskControlsViewsMock = {
  readonly views: TaskControlsViews;
  /** The one panel `views.build` hands out. */
  readonly elements: TaskControlsElements;
  /** The rows built so far, the latest last. */
  readonly rows: TaskControlsRow[];
};

/** The real page and "…" builders, recording every button and menu they build. */
export type TaskWidgetViewsMock = {
  readonly page: PageElements;
  readonly views: Pick<WidgetViews, 'packageButton' | 'menu'>;
  /** The "…" buttons built so far, the latest last. */
  readonly buttons: HTMLButtonElement[];
  /** The menus built so far, the latest last. */
  readonly menus: MenuElements[];
};
