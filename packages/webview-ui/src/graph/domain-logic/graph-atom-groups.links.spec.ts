import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { EdgeRoute, Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import { ATOM_BOX_PREFIX } from '../common/graph-atom.const.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { E2E_CI, SIZE, SIZES, atomRigOf, layoutOf } from '../test/utils/graph-atom-groups.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { atomPositionsOf } from '../utils/atom-positions.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { routeSegmentsOf } from '../utils/route-segments.util.ts';

const UMBRELLA = 'app#e2e-ci';

const TARGET = 'lib#build';

const BOX_ID = `${ATOM_BOX_PREFIX}${UMBRELLA}`;

const SHOWN = new Set([UMBRELLA]);

const TASKS = [taskOf(UMBRELLA, [TARGET]), taskOf(TARGET, [])];

const UMBRELLA_AT: Position = { x: 0, y: 0 };

const TARGET_AT: Position = { x: 0, y: 200 };

const BASE: Positions = { [UMBRELLA]: UMBRELLA_AT, [TARGET]: TARGET_AT };

const LINK_ID = edgeIdOf({ source: UMBRELLA, target: TARGET });

const ROUTE_START: Position = { x: 10, y: 24 };

const ROUTE_BENDS: Position[] = [{ x: 10, y: 100 }];

const ROUTE_END: Position = { x: 10, y: 184 };

const ROUTE: EdgeRoute = { start: ROUTE_START, bends: ROUTE_BENDS, end: ROUTE_END };

const ROUTES: Routes = { [LINK_ID]: ROUTE };

const SPEC: AtomDrawSpec = {
  umbrellaId: UMBRELLA,
  umbrellaSize: SIZE,
  fileIds: E2E_CI.files.map((file) => file.id),
  files: E2E_CI.files,
  hidden: 0
};

/** How far below the open umbrella's centre its box ends. */
const boxDropOf = (): number => {
  const { positions, boxes } = atomPositionsOf(BASE, [SPEC], SHOWN);
  const box = boxes[BOX_ID];
  const umbrella = positions[UMBRELLA];

  if (box === undefined || umbrella === undefined) return Number.NaN;

  return box.y + box.height - umbrella.y;
};

const lastSegmentsOf = (rig: AtomRig): ReadonlyMap<string, RouteSegments> | undefined => rig.atoms.setSegments.mock.lastCall?.[0];

describe('FEATURE: the links out of an expanded Atomizer umbrella', () => {
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  beforeEach(() => {
    rig = atomRigOf();
    groups = new GraphAtomGroups(rig.deps);
    groups.received([E2E_CI]);
    groups.placed(SHOWN, layoutOf(BASE, ROUTES), SIZES, TASKS);
  });

  describe('GIVEN a placed layout with a routed link out of the collapsed umbrella', () => {
    it('WHEN the umbrella is toggled THEN its link leaves the bottom of the box at the x its route left the umbrella by', () => {
      const expected = `10px ${boxDropOf()}px`;

      groups.toggle(UMBRELLA);

      expect(lastSegmentsOf(rig)?.get(LINK_ID)?.srcEnd).toBe(expected);
    });

    it('WHEN the umbrella is toggled twice THEN its link is back on the segments of its base route', () => {
      const base = routeSegmentsOf(ROUTE, UMBRELLA_AT, TARGET_AT);
      const expected = new Map([[LINK_ID, base]]);

      groups.toggle(UMBRELLA);
      groups.toggle(UMBRELLA);

      expect(lastSegmentsOf(rig)).toStrictEqual(expected);
    });

    it('WHEN a drag straightened the link and the umbrella is then toggled THEN the link is left as it is', () => {
      groups.rebased(layoutOf(BASE));

      groups.toggle(UMBRELLA);

      expect(lastSegmentsOf(rig)?.size).toBe(0);
    });
  });
});
