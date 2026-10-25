import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { GraphAtomGroupState } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec } from '../common/atom-layout.type.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { BASE, E2E_CI, SIZE, SIZES, TASKS, atomRigOf, groupOf } from '../test/utils/graph-atom-groups.spec.util.ts';
import { atomPositionsOf } from '../utils/atom-positions.util.ts';

const UMBRELLA = 'app#e2e-ci';

const SHOWN = new Set([UMBRELLA]);

const fileIdsOf = (group: GraphAtomGroup): string[] => group.files.map((file) => file.id);

const specOf = (group: GraphAtomGroup): AtomBoxSpec => {
  const spec: AtomBoxSpec = { umbrellaId: group.umbrellaId, umbrellaSize: SIZE, fileIds: fileIdsOf(group) };

  return spec;
};

const expandedPositionsOf = (group: GraphAtomGroup, base: Positions): Positions => {
  const { positions } = atomPositionsOf(base, [specOf(group)], SHOWN);

  return positions;
};

const FILE_IDS = fileIdsOf(E2E_CI);

const [FIRST_FILE = '', SECOND_FILE = ''] = FILE_IDS;

const OUTCOME_FILES: GraphAtomGroupState['files'] = { [FIRST_FILE]: 'failed', [SECOND_FILE]: 'cached' };

const OUTCOME_GROUP: GraphAtomGroupState = { counts: '10 files · 1 failed', files: OUTCOME_FILES };

const OUTCOME_STATE: Record<string, GraphAtomGroupState> = { [UMBRELLA]: OUTCOME_GROUP };

const SPACED_FILE = 'app#e2e-ci--tests/b fails.spec.ts';

const SPACED_FILES: GraphAtomGroup['files'] = [{ id: SPACED_FILE, specPath: 'tests/b fails.spec.ts', isLive: false }];

const SPACED_GROUP: GraphAtomGroup = { umbrellaId: UMBRELLA, files: SPACED_FILES };

const MOVED_AT: Position = { x: 300, y: 400 };

const MOVED_BASE: Positions = { [UMBRELLA]: MOVED_AT };

describe('FEATURE: expanding an Atomizer group of the task graph', () => {
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  beforeEach(() => {
    rig = atomRigOf();
    groups = new GraphAtomGroups(rig.deps);
    groups.received([E2E_CI]);
    groups.placed(SHOWN, BASE, SIZES, TASKS);
    rig.atoms.setGrabbable.mockClear();
  });

  describe('GIVEN a placed layout showing the umbrella collapsed', () => {
    it('WHEN the umbrella is toggled THEN its files are drawn in its package box with the files placed', () => {
      groups.toggle(UMBRELLA);

      expect(rig.atoms.expand).toHaveBeenCalledExactlyOnceWith(specOf(E2E_CI), 'pkg:app', E2E_CI.files, {});
      expect(rig.atoms.setPositions).toHaveBeenLastCalledWith(expandedPositionsOf(E2E_CI, BASE));
    });

    it.each([
      ['its box', `atom:${UMBRELLA}`],
      ['one of its files', FIRST_FILE]
    ])('WHEN %s is toggled THEN the group expands', (_name, nodeId) => {
      groups.toggle(nodeId);

      expect(rig.atoms.expand).toHaveBeenCalledOnce();
    });

    it.each([
      ['a plain task', 'lib#e2e-ci'],
      ['a task of no group', 'app#build'],
      ['an empty id', '']
    ])('WHEN %s is toggled THEN nothing changes', (_name, nodeId) => {
      groups.toggle(nodeId);

      expect(rig.atoms.expand).not.toHaveBeenCalled();
      expect(rig.atoms.setPositions).not.toHaveBeenCalled();
      expect(rig.atoms.setGrabbable).not.toHaveBeenCalled();
    });

    it('WHEN it is toggled THEN autoungrabify holds, and the runs are marked again', () => {
      groups.toggle(UMBRELLA);

      expect(rig.atoms.setGrabbable).toHaveBeenLastCalledWith(false);
      expect(rig.tasks.remark).toHaveBeenCalledOnce();
    });

    it('WHEN it is toggled twice THEN the group collapses and every node is back on the base', () => {
      groups.toggle(UMBRELLA);
      groups.toggle(UMBRELLA);

      expect(rig.atoms.collapse).toHaveBeenCalledExactlyOnceWith(UMBRELLA, 'pkg:app');
      expect(rig.atoms.setPositions).toHaveBeenLastCalledWith(BASE);
      expect(rig.atoms.setGrabbable).toHaveBeenLastCalledWith(true);
    });

    it('WHEN a file id holds a space and slashes THEN it toggles the group', () => {
      groups.received([SPACED_GROUP]);

      groups.toggle(SPACED_FILE);

      expect(rig.atoms.expand).toHaveBeenCalledExactlyOnceWith(specOf(SPACED_GROUP), 'pkg:app', SPACED_GROUP.files, {});
    });

    it('WHEN atoms arrived with outcomes before it THEN the files are drawn with them', () => {
      groups.states(OUTCOME_STATE);

      groups.toggle(UMBRELLA);

      expect(rig.atoms.expand).toHaveBeenCalledWith(specOf(E2E_CI), 'pkg:app', E2E_CI.files, OUTCOME_STATE[UMBRELLA]?.files);
    });

    it('WHEN the group has no files THEN toggling does nothing', () => {
      groups.received([groupOf(UMBRELLA, 0)]);

      groups.toggle(UMBRELLA);

      expect(rig.atoms.expand).not.toHaveBeenCalled();
    });

    it('WHEN the layout was dragged and the group then expands THEN the positions start from the dragged base', () => {
      groups.rebased(MOVED_BASE);

      groups.toggle(UMBRELLA);

      expect(rig.atoms.setPositions).toHaveBeenLastCalledWith(expandedPositionsOf(E2E_CI, MOVED_BASE));
    });
  });

  describe('GIVEN the group is expanded', () => {
    beforeEach(() => {
      groups.toggle(UMBRELLA);
      rig.atoms.expand.mockClear();
      rig.atoms.setPositions.mockClear();
    });

    it('WHEN atoms arrive THEN only the outcomes change, with no new drawing and no position', () => {
      groups.states(OUTCOME_STATE);

      expect(rig.atoms.setOutcomes).toHaveBeenCalledExactlyOnceWith(OUTCOME_STATE[UMBRELLA]?.files);
      expect(rig.atoms.expand).not.toHaveBeenCalled();
      expect(rig.atoms.setPositions).not.toHaveBeenCalled();
    });

    it('WHEN the same groups are received again THEN nothing is redrawn', () => {
      groups.received([E2E_CI]);

      expect(rig.atoms.collapse).not.toHaveBeenCalled();
      expect(rig.atoms.expand).not.toHaveBeenCalled();
    });

    it('WHEN the same key brings another file list THEN the files are replaced and the positions recomputed', () => {
      const replaced = groupOf(UMBRELLA, 4);

      groups.received([replaced]);

      expect(rig.atoms.collapse).toHaveBeenCalledExactlyOnceWith(UMBRELLA, 'pkg:app');
      expect(rig.atoms.expand).toHaveBeenCalledExactlyOnceWith(specOf(replaced), 'pkg:app', replaced.files, {});
      expect(rig.atoms.setPositions).toHaveBeenLastCalledWith(expandedPositionsOf(replaced, BASE));
    });

    it('WHEN the group leaves the received groups THEN it collapses and grabbing returns', () => {
      groups.received([]);

      expect(rig.atoms.collapse).toHaveBeenCalledExactlyOnceWith(UMBRELLA, 'pkg:app');
      expect(rig.atoms.setGrabbable).toHaveBeenLastCalledWith(true);
    });

    it('WHEN a layout is placed with the group still shown THEN it is drawn again on the new base', () => {
      groups.placed(SHOWN, MOVED_BASE, SIZES, TASKS);

      expect(rig.atoms.expand).toHaveBeenCalledOnce();
      expect(rig.atoms.setPositions).toHaveBeenLastCalledWith(expandedPositionsOf(E2E_CI, MOVED_BASE));
      expect(rig.atoms.setGrabbable).toHaveBeenLastCalledWith(false);
    });

    it('WHEN a layout is placed without the group THEN its entry is dropped and grabbing returns', () => {
      groups.placed(new Set(['app#build']), BASE, new Map(), TASKS);
      groups.placed(SHOWN, BASE, SIZES, TASKS);

      expect(rig.atoms.expand).not.toHaveBeenCalled();
      expect(rig.atoms.setGrabbable).toHaveBeenLastCalledWith(true);
    });

    it('WHEN the layout is cleared THEN the group collapses, grabbing returns and the next layout starts collapsed', () => {
      groups.clear();
      groups.placed(SHOWN, BASE, SIZES, TASKS);

      expect(rig.atoms.collapse).toHaveBeenCalledExactlyOnceWith(UMBRELLA, 'pkg:app');
      expect(rig.atoms.setGrabbable).toHaveBeenLastCalledWith(true);
      expect(rig.atoms.expand).not.toHaveBeenCalled();
    });

    it('WHEN the layout is cleared THEN toggling does nothing until a layout is placed', () => {
      groups.clear();

      groups.toggle(UMBRELLA);

      expect(rig.atoms.expand).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the toggle clock', () => {
    it('WHEN the first frame renders after a toggle THEN toggleMs is the time from the toggle to it', () => {
      rig.now.mockReturnValueOnce(100).mockReturnValueOnce(117);

      groups.toggle(UMBRELLA);
      const before = groups.toggleMs();

      groups.rendered();

      expect([before, groups.toggleMs()]).toStrictEqual([null, 17]);
    });

    it('WHEN more frames render THEN toggleMs keeps the first', () => {
      rig.now.mockReturnValueOnce(100).mockReturnValueOnce(117).mockReturnValue(900);

      groups.toggle(UMBRELLA);
      groups.rendered();
      groups.rendered();

      expect(groups.toggleMs()).toBe(17);
    });

    it('WHEN a toggle changes nothing THEN the clock does not start', () => {
      groups.toggle('app#build');
      groups.rendered();

      expect(groups.toggleMs()).toBeNull();
    });

    it('WHEN the toggled group has no files to draw THEN the clock does not start', () => {
      groups.received([groupOf(UMBRELLA, 0)]);

      groups.toggle(UMBRELLA);
      groups.rendered();

      expect(groups.toggleMs()).toBeNull();
    });
  });
});
