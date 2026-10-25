import { vi } from 'vitest';

import { taskOf } from './shown-set.spec.util.ts';
import type { GraphAtomGroupState } from '../../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup, GraphTask, Position, Positions } from '../../../bridge/common/graph-state.type.ts';
import type { AtomGroupsDeps } from '../../common/graph-atom.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import type { AtomRig } from '../common/graph-atom-groups.type.ts';
import { atomCanvasMock, taskCanvasMock } from '../mocks/graph-view.mock.ts';

export const SIZE: NodeSize = { width: 200, height: 48 };

export const SIZES = new Map([['app#e2e-ci', SIZE]]);

const E2E_CI_AT: Position = { x: 10, y: 20 };

export const BASE: Positions = { 'app#e2e-ci': E2E_CI_AT };

/** The tasks a layout is placed with: the umbrella `app#e2e-ci` in package `app`. */
export const TASKS: GraphTask[] = [taskOf('app#e2e-ci', []), taskOf('lib#e2e-ci', [])];

export const statesOf = (umbrellaId: string, counts: string): Record<string, GraphAtomGroupState> => {
  const state: GraphAtomGroupState = { counts, files: {} };
  const states = { [umbrellaId]: state };

  return states;
};

export const groupOf = (umbrellaId: string, fileCount: number): GraphAtomGroup => {
  const makeFile = (_value: unknown, index: number): GraphAtomGroup['files'][number] => {
    const file = { id: `${umbrellaId}--${index}.spec.ts`, specPath: `${index}.spec.ts`, isLive: false };

    return file;
  };
  const files = Array.from({ length: fileCount }, makeFile);
  const group: GraphAtomGroup = { umbrellaId, files };

  return group;
};

export const E2E_CI = groupOf('app#e2e-ci', 10);

export const LIB_CI = groupOf('lib#e2e-ci', 2);

/** Mock canvases, a spy bridge and a clock the spec sets with `rig.now.mockReturnValue`, as the deps of a `GraphAtomGroups`. */
export const atomRigOf = (): AtomRig => {
  const tasks = taskCanvasMock();
  const atoms = atomCanvasMock();
  const post = vi.fn<AtomGroupsDeps['bridge']['post']>();
  const now = vi.fn<AtomGroupsDeps['now']>(() => 0);
  const view = { tasks, atoms };
  const bridge = { post };
  const deps: AtomGroupsDeps = { view, bridge, now };
  const rig: AtomRig = { deps, tasks, atoms, post, now };

  return rig;
};
