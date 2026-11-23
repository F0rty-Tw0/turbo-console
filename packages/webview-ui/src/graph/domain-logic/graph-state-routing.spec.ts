import { beforeEach, describe, expect, it } from 'vitest';

import { GraphStateRouting } from './graph-state-routing.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { RoutingRig } from '../test/common/state-routing.type.ts';
import { TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { EXIT_AT, LOADING, NEW_HASH, SINGLE, routingRigOf } from '../test/utils/state-routing.spec.util.ts';

describe('FEATURE: GraphStateRouting', () => {
  let rig: RoutingRig;
  let routing: GraphStateRouting;

  /** The routing over the rig's fakes: task mode in `isTaskMode`, modules mode in `isModuleMode`. */
  const open = (isTaskMode: boolean, isModuleMode = false): void => {
    rig = routingRigOf(isTaskMode, isModuleMode);
    routing = new GraphStateRouting(rig.deps);
  };

  describe('GIVEN package mode', () => {
    beforeEach(() => {
      open(false);
    });

    it('WHEN a new hash arrives THEN task mode reads it and the package side shows it at its arrival', () => {
      routing.show(NEW_HASH, 7);

      expect(rig.tasks.received).toHaveBeenCalledExactlyOnceWith(NEW_HASH, 7);
      expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(NEW_HASH, 7);
    });

    it('WHEN loading arrives THEN only the package side shows it, and neither the mode group nor task mode is touched', () => {
      routing.show(LOADING, 7);

      expect(rig.tasks.received).not.toHaveBeenCalled();
      expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(LOADING, 7);
      expect(rig.hideModes).not.toHaveBeenCalled();
      expect(rig.tasks.enter).not.toHaveBeenCalled();
    });

    it('WHEN a monorepo state arrives THEN task mode is not entered and the package side shows it', () => {
      routing.show(NEW_HASH, 7);

      expect(rig.tasks.enter).not.toHaveBeenCalled();
      expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(NEW_HASH, 7);
    });

    it('WHEN a single-package state arrives THEN task mode is entered at its arrival and the package graph is never drawn', () => {
      routing.show(SINGLE, 7);

      const receivedAt = rig.tasks.received.mock.invocationCallOrder[0] ?? Number.NaN;
      const enteredAt = rig.tasks.enter.mock.invocationCallOrder[0] ?? Number.NaN;

      expect(rig.tasks.received).toHaveBeenCalledExactlyOnceWith(SINGLE, 7);
      expect(rig.tasks.enter).toHaveBeenCalledExactlyOnceWith(7);
      expect(receivedAt).toBeLessThan(enteredAt);
      expect(rig.packages.show).not.toHaveBeenCalled();
    });

    it.each([[true], [false]])('WHEN a graph state with singlePackage %s arrives THEN the mode group is hidden to match', (flag) => {
      const state: GraphReady = { ...TASK_STATE_STUB, singlePackage: flag, rootLabel: null };

      routing.show(state, 7);

      expect(rig.hideModes).toHaveBeenLastCalledWith(flag);
    });
  });

  describe('GIVEN task mode over the drawn h1', () => {
    beforeEach(() => {
      open(true);
    });

    it('WHEN a single-package state arrives THEN task mode is not entered again', () => {
      routing.show(SINGLE, 7);

      expect(rig.tasks.enter).not.toHaveBeenCalled();
    });

    it('WHEN a single-package state arrives THEN the package side is not shown it', () => {
      routing.show(SINGLE, 7);

      expect(rig.packages.show).not.toHaveBeenCalled();
    });

    it('WHEN a state of h1 arrives THEN the package side refreshes with it', () => {
      routing.show(TASK_STATE_STUB, 7);

      expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(TASK_STATE_STUB, 7);
    });

    it('WHEN task mode exits with nothing held THEN the mode button focus is kept and the package graph is drawn again', () => {
      routing.exitTo('packages');

      expect(rig.packages.keepModeFocus).toHaveBeenCalledOnce();
      expect(rig.packages.redraw).toHaveBeenCalledOnce();
    });

    describe('WHEN h2 arrives', () => {
      beforeEach(() => {
        routing.show(NEW_HASH, 7);
      });

      it('THEN task mode reads it and the package side waits', () => {
        expect(rig.tasks.received).toHaveBeenCalledExactlyOnceWith(NEW_HASH, 7);
        expect(rig.packages.show).not.toHaveBeenCalled();
      });

      it('THEN task mode exiting shows h2 timed from the exit, not from its arrival', () => {
        routing.exitTo('packages');

        expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(NEW_HASH, EXIT_AT);
        expect(rig.packages.redraw).not.toHaveBeenCalled();
      });

      it('THEN a second exit draws the package graph again instead of h2', () => {
        routing.exitTo('packages');
        routing.exitTo('packages');

        expect(rig.packages.show).toHaveBeenCalledOnce();
        expect(rig.packages.redraw).toHaveBeenCalledOnce();
      });

      it('THEN h1 arriving after it drops it, so exiting draws the package graph again', () => {
        routing.show(TASK_STATE_STUB, 8);
        routing.exitTo('packages');

        expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(TASK_STATE_STUB, 8);
        expect(rig.packages.redraw).toHaveBeenCalledOnce();
      });

      it('THEN loading arriving after it drops it, so exiting draws the package graph again', () => {
        routing.show(LOADING, 8);
        routing.exitTo('packages');

        expect(rig.packages.show).toHaveBeenCalledExactlyOnceWith(LOADING, 8);
        expect(rig.packages.redraw).toHaveBeenCalledOnce();
      });
    });
  });
});
