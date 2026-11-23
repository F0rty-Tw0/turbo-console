import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { ModulesFound } from '../../../bridge/common/graph-modules.type.ts';
import type { GraphPackage, GraphReady, Position } from '../../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../../bridge/common/graph-view-state.type.ts';
import type { FrameClock } from '../../common/frame-clock.type.ts';
import type { Viewport } from '../../common/graph-page.type.ts';
import type { ModuleExit, ModuleModeDeps, ModuleModes, ModuleScreen, ModuleTaskSide } from '../../common/module-mode.type.ts';
import type { ModulePanelHooks } from '../../common/module-panels.type.ts';
import type { ModuleModeRig } from '../common/graph-module-mode.type.ts';
import { STATE_STUB } from '../stubs/graph-layouts.stub.ts';

const RIG_PAN: Position = { x: 3, y: 4 };

/** The camera the rig's view reports. */
export const RIG_CAMERA: Viewport = { zoom: 2, pan: RIG_PAN };

/** The receive time the specs hand each host reply. */
export const REPLY_AT = 10;

/** STATE_STUB lists web, ui and core under hash h1. */
export const WEB_LISTED: GraphReady = STATE_STUB;

const isNotWeb = ({ name }: GraphPackage): boolean => name !== 'web';

const WITHOUT_WEB: GraphPackage[] = STATE_STUB.packages.filter(isNotWeb);

/** A newer state, under h2, with web gone from the workspace. */
export const WEB_GONE: GraphReady = { ...STATE_STUB, hash: 'h2', packages: WITHOUT_WEB };

const FIRST_PACKAGE: GraphPackage[] = STATE_STUB.packages.slice(0, 1);

const rootOf = (info: GraphPackage): GraphPackage => {
  const root: GraphPackage = { ...info, name: '//', path: '' };

  return root;
};

const ROOT_PACKAGES: GraphPackage[] = FIRST_PACKAGE.map(rootOf);

/** A single-package root listing only `//`. */
export const ROOT_LISTED: GraphReady = { ...STATE_STUB, singlePackage: true, rootLabel: 'single-app', packages: ROOT_PACKAGES };

/**
 * Modules mode's deps over `modes`, with task mode in `isTaskMode`, a view whose camera is `RIG_CAMERA` and a screen
 * that reads every draw as landed.
 */
export const moduleModeRigOf = (modes: ModuleModes, isTaskMode = false): ModuleModeRig => {
  const post = vi.fn<Bridge['post']>();
  const bridge = { post };
  const screen: Mocked<ModuleScreen> = {
    enter: vi.fn(),
    scanning: vi.fn(),
    shown: vi.fn(),
    drawAgain: vi.fn(),
    isDrawn: vi.fn(() => true),
    failed: vi.fn(),
    reshow: vi.fn(),
    exit: vi.fn()
  };
  const tasks: Mocked<ModuleTaskSide> = { isActive: vi.fn(() => isTaskMode), leave: vi.fn() };
  const onExit = vi.fn<(to: ModuleExit) => void>();
  const notice = vi.fn<(text: string) => void>();
  const viewport = (): Viewport => RIG_CAMERA;
  const taskSide = (): ModuleTaskSide => tasks;
  const start = vi.fn<FrameClock['start']>();
  const frames = { start };
  const onView = vi.fn<(view: ModulesViewState) => void>();
  const panels: Mocked<ModulePanelHooks> = { enter: vi.fn(), scanning: vi.fn(), failed: vi.fn(), exit: vi.fn() };
  const onFound = vi.fn<(found: ModulesFound) => void>();
  const deps: ModuleModeDeps = { modes, bridge, screen, tasks: taskSide, onExit, notice, viewport, frames, onView, panels, onFound };
  const rig: ModuleModeRig = { deps, post, screen, tasks, onExit, notice, start, onView, panels, onFound };

  return rig;
};
