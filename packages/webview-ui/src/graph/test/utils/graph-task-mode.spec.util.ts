import { vi } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { WebviewMessage } from '../../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';
import type { Position } from '../../../bridge/common/graph-state.type.ts';
import type { GraphViewMode, GraphViewState, TaskViewState } from '../../../bridge/common/graph-view-state.type.ts';
import type { FrameClock } from '../../common/frame-clock.type.ts';
import type { Viewport } from '../../common/graph-page.type.ts';
import type { TaskModeDeps, TaskModes, TaskPanel, TaskView } from '../../common/graph-task.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import type { TaskControls } from '../../common/task-controls.type.ts';
import type { TaskDetails } from '../../common/task-details.type.ts';
import { freshViewStateOf } from '../../utils/fresh-view-state.util.ts';
import type { TaskModeRig, TaskPartsMock, TaskViewMock } from '../common/graph-task-mode.type.ts';
import { layoutScreenMock } from '../mocks/graph-layouts.mock.ts';
import { taskControlsMock, taskDetailsMock, taskPanelMock } from '../mocks/graph-task-mode.mock.ts';
import { taskCanvasMock } from '../mocks/graph-view.mock.ts';
import { layoutRunsMock } from '../mocks/layout-runner.mock.ts';
import { TASK_VIEW_STUB } from '../stubs/graph-task.stub.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const CAMERA_PAN: Position = { x: 12, y: 34 };

/** Where the fake camera sits whenever task mode reads it. */
export const TASK_CAMERA: Viewport = { zoom: 0.75, pan: CAMERA_PAN };

/** A saved view of hash `h1` in `mode` with `TASK_VIEW_STUB` and these task fields replaced. */
export const taskSavedOf = (task: Partial<TaskViewState>, mode: GraphViewMode = 'tasks'): GraphViewState => {
  const fresh = freshViewStateOf('h1');
  const view: TaskViewState = { ...TASK_VIEW_STUB, ...task };
  const saved: GraphViewState = { ...fresh, mode, task: view };

  return saved;
};

/** The task canvas and camera, each call that orders a layout noted by name. */
const taskViewMockOf = (noting: (name: string) => () => void): TaskViewMock => {
  const tasks = taskCanvasMock();
  const view: TaskViewMock = {
    tasks,
    fit: vi.fn<TaskView['fit']>(noting('fit')),
    setViewport: vi.fn<TaskView['setViewport']>(noting('setViewport')),
    viewport: vi.fn<TaskView['viewport']>(() => TASK_CAMERA),
    resize: vi.fn<TaskView['resize']>()
  };

  tasks.show.mockImplementation(noting('show'));

  return view;
};

const sizeOf = (): NodeSize => NODE_SIZE;

const taskPartsMockOf = (): TaskPartsMock => {
  const panel = taskPanelMock();
  const controls = taskControlsMock();
  const details = taskDetailsMock();
  const panelOf = vi.fn<TaskModeDeps['panelOf']>((): TaskPanel => panel);
  const controlsOf = vi.fn<TaskModeDeps['controlsOf']>((): TaskControls => controls);
  const detailsOf = vi.fn<TaskModeDeps['detailsOf']>((): TaskDetails => details);
  const parts: TaskPartsMock = { panel, controls, details, panelOf, controlsOf, detailsOf };

  return parts;
};

/** Every double a `GraphTaskMode` needs, over the spec's `modes`. */
export const taskModeRigOf = (modes: TaskModes): TaskModeRig => {
  const posted: (WebviewMessage | GraphWebviewMessage)[] = [];
  const called: string[] = [];
  const noting = (name: string): (() => void) => {
    const note = (): void => {
      called.push(name);
    };

    return note;
  };
  const post = (message: WebviewMessage | GraphWebviewMessage): void => {
    posted.push(message);
  };
  const view = taskViewMockOf(noting);
  const frames = { start: vi.fn<FrameClock['start']>(), arm: vi.fn<FrameClock['arm']>(noting('arm')) };
  const bridge: Bridge = { ready: vi.fn(), post, onMessage: vi.fn(), savedState: vi.fn(), saveState: vi.fn() };
  const runs = layoutRunsMock();
  const screen = layoutScreenMock();
  const parts = taskPartsMockOf();
  const { panelOf, controlsOf, detailsOf } = parts;
  const onExit = vi.fn<() => void>();
  const deps: TaskModeDeps = {
    view,
    runner: runs.runner,
    sizeOf,
    bridge,
    screen,
    modes,
    frames,
    onExit,
    panelOf,
    controlsOf,
    detailsOf
  };
  const posts = (): (WebviewMessage | GraphWebviewMessage)[] => [...posted];
  const calls = (): string[] => [...called];

  const rig: TaskModeRig = { ...parts, deps, view, runs, screen, frames, modes, posts, calls, onExit };

  return rig;
};
