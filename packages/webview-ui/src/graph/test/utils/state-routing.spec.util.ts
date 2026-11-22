import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { GraphReady, GraphState } from '../../../bridge/common/graph-state.type.ts';
import type { RoutedModuleMode, RoutedPackageSide, RoutedTaskMode, StateRoutingDeps } from '../../common/state-routing.type.ts';
import type { RoutingRig } from '../common/state-routing.type.ts';
import { TASK_STATE_STUB } from '../stubs/graph-task.stub.ts';

/** When task or modules mode exits, the clock reads this. */
export const EXIT_AT = 50;

/** A new package hash, which task and modules mode hold. */
export const NEW_HASH: GraphReady = { ...TASK_STATE_STUB, hash: 'h2' };

export const LOADING: GraphState = { kind: 'loading' };

/** A single-package root's state, under a hash no package graph drew: task mode opens on it straight away. */
export const SINGLE: GraphReady = { ...NEW_HASH, singlePackage: true, rootLabel: 'single-app' };

/** The routing's deps: task mode in `isTaskMode`, which `enter` turns on, modules mode in `isModuleMode`, and a package side with `h1` drawn. */
export const routingRigOf = (isTaskMode: boolean, isModuleMode = false): RoutingRig => {
  let isActive = isTaskMode;
  const tasks: Mocked<RoutedTaskMode> = {
    received: vi.fn(),
    isActive: vi.fn(() => isActive),
    enter: vi.fn(() => {
      isActive = true;
    })
  };
  const modules: Mocked<RoutedModuleMode> = { isActive: vi.fn(() => isModuleMode), received: vi.fn() };
  const packages: Mocked<RoutedPackageSide> = {
    show: vi.fn(),
    drawnHash: vi.fn(() => 'h1'),
    redraw: vi.fn(),
    keepModeFocus: vi.fn()
  };
  const hideModes = vi.fn<(isHidden: boolean) => void>();
  const deps: StateRoutingDeps = { tasks, modules, packages, hideModes, now: (): number => EXIT_AT };
  const rig: RoutingRig = { deps, tasks, modules, packages, hideModes };

  return rig;
};
