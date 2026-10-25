import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { BASE, SIZES, TASKS, atomRigOf, groupOf } from '../test/utils/graph-atom-groups.spec.util.ts';

const UMBRELLA = 'app#e2e-ci';

const MORE_ID = `atom-more:${UMBRELLA}`;

const SHOWN = new Set([UMBRELLA]);

describe('FEATURE: toggling a capped Atomizer group by its count node', () => {
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  beforeEach(() => {
    rig = atomRigOf();
    groups = new GraphAtomGroups(rig.deps);
    groups.received([groupOf(UMBRELLA, 12)]);
    groups.placed(SHOWN, BASE, SIZES, TASKS);
  });

  describe('GIVEN a 12-file group expanded', () => {
    beforeEach(() => {
      groups.toggle(UMBRELLA);
    });

    it('WHEN the count node is double tapped THEN the group collapses', () => {
      rig.atoms.collapse.mockClear();

      groups.toggle(MORE_ID);

      expect(rig.atoms.collapse).toHaveBeenCalledExactlyOnceWith(UMBRELLA, 'pkg:app');
    });

    it('WHEN the count node of an unknown umbrella is double tapped THEN nothing changes', () => {
      rig.atoms.collapse.mockClear();
      rig.atoms.expand.mockClear();

      groups.toggle('atom-more:unknown#x');

      expect(rig.atoms.collapse).not.toHaveBeenCalled();
      expect(rig.atoms.expand).not.toHaveBeenCalled();
    });
  });
});
