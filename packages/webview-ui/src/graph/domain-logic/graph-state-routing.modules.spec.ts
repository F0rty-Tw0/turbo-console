import { beforeEach, describe, expect, it } from 'vitest';

import { GraphStateRouting } from './graph-state-routing.ts';
import type { RoutingRig } from '../test/common/state-routing.type.ts';
import { EXIT_AT, NEW_HASH, SINGLE, routingRigOf } from '../test/utils/state-routing.spec.util.ts';

describe('FEATURE: GraphStateRouting in modules mode', () => {
  let rig: RoutingRig;
  let routing: GraphStateRouting;

  /** The routing over the rig's fakes: task mode in `isTaskMode`, modules mode in `isModuleMode`. */
  const open = (isTaskMode: boolean, isModuleMode = false): void => {
    rig = routingRigOf(isTaskMode, isModuleMode);
    routing = new GraphStateRouting(rig.deps);
  };

  describe('GIVEN modules mode over a package side with h1 drawn', () => {
    beforeEach(() => {
      open(false, true);
    });

    it('WHEN a new hash arrives THEN modules mode reads it and the package side does not show it', () => {
      routing.show(NEW_HASH, 7);

      expect(rig.modules.received).toHaveBeenCalledWith(NEW_HASH);
      expect(rig.packages.show).not.toHaveBeenCalled();
    });

    it('WHEN a single-package state arrives THEN task mode is not turned on', () => {
      routing.show(SINGLE, 7);

      expect(rig.tasks.enter).not.toHaveBeenCalled();
    });

    it('WHEN a new hash was held and modules exits to packages THEN the held state is shown once at the exit time', () => {
      routing.show(NEW_HASH, 7);
      routing.exitTo('packages');

      expect(rig.packages.show.mock.calls).toStrictEqual([[NEW_HASH, EXIT_AT]]);
    });

    it('WHEN modules exits to tasks THEN task mode is entered at the exit time and nothing is drawn on the package side', () => {
      routing.exitTo('tasks');

      expect(rig.tasks.enter).toHaveBeenCalledWith(EXIT_AT);
      expect([rig.packages.show.mock.calls, rig.packages.redraw.mock.calls]).toStrictEqual([[], []]);
    });
  });

  describe('GIVEN modules mode that leaves when it reads a state', () => {
    it('WHEN the state arrives THEN the package side shows it once', () => {
      open(false, true);
      rig.modules.received.mockImplementation(() => routing.exitTo('packages'));
      routing.show(NEW_HASH, 7);

      expect(rig.packages.show).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN task mode with h2 held', () => {
    beforeEach(() => {
      open(true);
      routing.show(NEW_HASH, 7);
    });

    it('WHEN task mode exits toward modules THEN the held state stays held and nothing is drawn', () => {
      routing.exitTo('modules');

      expect([rig.packages.show.mock.calls, rig.packages.redraw.mock.calls, rig.packages.keepModeFocus.mock.calls]).toStrictEqual([
        [],
        [],
        []
      ]);
    });

    it('WHEN task mode exits toward modules and later to packages THEN the held state is shown', () => {
      routing.exitTo('modules');
      routing.exitTo('packages');

      expect(rig.packages.show.mock.calls).toStrictEqual([[NEW_HASH, EXIT_AT]]);
    });
  });
});
