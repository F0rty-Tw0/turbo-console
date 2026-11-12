import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import { ATOM_BOX_PREFIX } from '../common/graph-atom.const.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { E2E_CI, SIZE, SIZES, atomRigOf, layoutOf } from '../test/utils/graph-atom-groups.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { atomPositionsOf } from '../utils/atom-positions.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const UMBRELLA = 'app#e2e-ci';

const TARGET = 'lib#build';

const BOX_ID = `${ATOM_BOX_PREFIX}${UMBRELLA}`;

const SHOWN = new Set([UMBRELLA]);

const TASKS = [taskOf(UMBRELLA, [TARGET]), taskOf(TARGET, [])];

const UMBRELLA_AT: Position = { x: 0, y: 0 };

const TARGET_AT: Position = { x: 0, y: 200 };

const BASE: Positions = { [UMBRELLA]: UMBRELLA_AT, [TARGET]: TARGET_AT };

const UMBRELLA_DRAGGED_AT: Position = { x: 40, y: 0 };

const LINK_ID = edgeIdOf({ source: UMBRELLA, target: TARGET });

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

const lastEndsOf = (rig: AtomRig): ReadonlyMap<string, string | null> | undefined => rig.atoms.setLinkEnds.mock.lastCall?.[0];

describe('FEATURE: the links out of an expanded Atomizer umbrella', () => {
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  beforeEach(() => {
    rig = atomRigOf();
    groups = new GraphAtomGroups(rig.deps);
    groups.received([E2E_CI]);
    groups.placed(SHOWN, layoutOf(BASE), SIZES, TASKS);
  });

  describe('GIVEN a placed layout with a link out of the collapsed umbrella', () => {
    it('WHEN the umbrella is toggled THEN its link leaves the bottom of the box under the umbrella centre', () => {
      const expected = `0px ${boxDropOf()}px`;

      groups.toggle(UMBRELLA);

      expect(lastEndsOf(rig)?.get(LINK_ID)).toBe(expected);
    });

    it('WHEN the umbrella is toggled twice THEN its link leaves the umbrella border again', () => {
      const expected = new Map([[LINK_ID, null]]);

      groups.toggle(UMBRELLA);
      groups.toggle(UMBRELLA);

      expect(lastEndsOf(rig)).toStrictEqual(expected);
    });

    it('WHEN the umbrella was dragged and is then toggled THEN its link leaves the box bottom under its dragged centre', () => {
      const dragged: Positions = { ...BASE, [UMBRELLA]: UMBRELLA_DRAGGED_AT };
      const expected = `0px ${boxDropOf()}px`;

      groups.rebased(layoutOf(dragged));
      groups.toggle(UMBRELLA);

      expect(lastEndsOf(rig)?.get(LINK_ID)).toBe(expected);
    });
  });
});
