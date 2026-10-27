import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mocked } from 'vitest';

import { GraphStateRouting } from './graph-state-routing.ts';
import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { RoutedPackageSide, RoutedTaskMode } from '../common/state-routing.type.ts';
import { TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';

type RoutingRig = {
  readonly routing: GraphStateRouting;
  readonly tasks: Mocked<RoutedTaskMode>;
  readonly packages: Mocked<RoutedPackageSide>;
};

/** When task mode exits, the clock reads this. */
const EXIT_AT = 50;

/** A new package hash, which task mode holds. */
const NEW_HASH: GraphReady = { ...TASK_STATE_STUB, hash: 'h2' };

const LOADING: GraphState = { kind: 'loading' };

/** The routing over task mode in `isTaskMode` and a package side with `h1` drawn. */
const rigOf = (isTaskMode: boolean): RoutingRig => {
  const tasks: Mocked<RoutedTaskMode> = { received: vi.fn(), isActive: vi.fn(() => isTaskMode) };
  const packages: Mocked<RoutedPackageSide> = {
    show: vi.fn(),
    drawnHash: vi.fn(() => 'h1'),
    redraw: vi.fn(),
    keepModeFocus: vi.fn()
  };
  const routing = new GraphStateRouting({ tasks, packages, now: (): number => EXIT_AT });
  const rig: RoutingRig = { routing, tasks, packages };

  return rig;
};

describe('FEATURE: GraphStateRouting', () => {
  let rig: RoutingRig;

  describe('GIVEN package mode', () => {
    beforeEach(() => {
      rig = rigOf(false);
    });

    it('WHEN a new hash arrives THEN task mode reads it and the package side shows it at its arrival', () => {
      rig.routing.show(NEW_HASH, 7);

      expect(rig.tasks.received).toHaveBeenCalledExactlyOnceWith(NEW_HASH, 7);
      expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(NEW_HASH, 7);
    });

    it('WHEN loading arrives THEN only the package side shows it', () => {
      rig.routing.show(LOADING, 7);

      expect(rig.tasks.received).not.toHaveBeenCalled();
      expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(LOADING, 7);
    });
  });

  describe('GIVEN task mode over the drawn h1', () => {
    beforeEach(() => {
      rig = rigOf(true);
    });

    it('WHEN a state of h1 arrives THEN the package side refreshes with it', () => {
      rig.routing.show(TASK_STATE_STUB, 7);

      expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(TASK_STATE_STUB, 7);
    });

    it('WHEN task mode exits with nothing held THEN the mode button focus is kept and the package graph is drawn again', () => {
      rig.routing.exitTasks();

      expect(rig.packages.keepModeFocus).toHaveBeenCalledOnce();
      expect(rig.packages.redraw).toHaveBeenCalledOnce();
    });

    describe('WHEN h2 arrives', () => {
      beforeEach(() => {
        rig.routing.show(NEW_HASH, 7);
      });

      it('THEN task mode reads it and the package side waits', () => {
        expect(rig.tasks.received).toHaveBeenCalledExactlyOnceWith(NEW_HASH, 7);
        expect(rig.packages.show).not.toHaveBeenCalled();
      });

      it('THEN task mode exiting shows h2 timed from the exit, not from its arrival', () => {
        rig.routing.exitTasks();

        expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(NEW_HASH, EXIT_AT);
        expect(rig.packages.redraw).not.toHaveBeenCalled();
      });

      it('THEN a second exit draws the package graph again instead of h2', () => {
        rig.routing.exitTasks();
        rig.routing.exitTasks();

        expect(rig.packages.show).toHaveBeenCalledOnce();
        expect(rig.packages.redraw).toHaveBeenCalledOnce();
      });

      it('THEN h1 arriving after it drops it, so exiting draws the package graph again', () => {
        rig.routing.show(TASK_STATE_STUB, 8);
        rig.routing.exitTasks();

        expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(TASK_STATE_STUB, 8);
        expect(rig.packages.redraw).toHaveBeenCalledOnce();
      });

      it('THEN loading arriving after it drops it, so exiting draws the package graph again', () => {
        rig.routing.show(LOADING, 8);
        rig.routing.exitTasks();

        expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(LOADING, 8);
        expect(rig.packages.redraw).toHaveBeenCalledOnce();
      });
    });
  });
});
