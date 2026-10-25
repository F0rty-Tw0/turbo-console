import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { GraphAtomGroupState, GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { BASE, SIZES, TASKS, atomRigOf, groupOf } from '../test/utils/graph-atom-groups.spec.util.ts';

const UMBRELLA = 'app#e2e-ci';

const MORE_ID = `atom-more:${UMBRELLA}`;

const SHOWN = new Set([UMBRELLA]);

/** The id of the Kth file of a group, counting from 1: `f01` is the first. */
const fileId = (position: number): string => `${UMBRELLA}--${position - 1}.spec.ts`;

const atomsOf = (files: Record<string, GraphAtomOutcome>): Record<string, GraphAtomGroupState> => {
  const state: GraphAtomGroupState = { counts: '40 files', files };
  const states = { [UMBRELLA]: state };

  return states;
};

type Draw = { readonly spec: AtomDrawSpec; readonly outcomes: Record<string, GraphAtomOutcome> };

/** The spec and outcomes of the last `expand` call. */
const lastDrawOf = (rig: AtomRig): Draw => {
  const call = rig.atoms.expand.mock.lastCall;

  if (call === undefined) throw new Error('expand was never called');

  const [spec, , outcomes] = call;
  const draw: Draw = { spec, outcomes };

  return draw;
};

const drawnIdsOf = (rig: AtomRig): string[] => lastDrawOf(rig).spec.files.map((file) => file.id);

/** The group with the file at `position` marked live. */
const withLiveFile = (group: GraphAtomGroup, position: number): GraphAtomGroup => {
  const liveId = fileId(position);
  const markLive = (file: GraphAtomGroup['files'][number]): GraphAtomGroup['files'][number] => {
    const isLive = file.id === liveId;

    if (!isLive) return file;

    const live = { ...file, isLive: true };

    return live;
  };
  const files = group.files.map(markLive);
  const marked = { ...group, files };

  return marked;
};

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

describe('FEATURE: redrawing a capped Atomizer group when its drawn files change', () => {
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  beforeEach(() => {
    rig = atomRigOf();
    groups = new GraphAtomGroups(rig.deps);
    groups.received([groupOf(UMBRELLA, 40)]);
    groups.placed(SHOWN, BASE, SIZES, TASKS);
  });

  describe('GIVEN a 40-file group expanded with no outcomes', () => {
    beforeEach(() => {
      groups.toggle(UMBRELLA);
    });

    describe('WHEN an atoms message fails f30, which is not drawn', () => {
      beforeEach(() => {
        rig.atoms.collapse.mockClear();
        rig.atoms.expand.mockClear();

        groups.states(atomsOf({ [fileId(30)]: 'failed' }));
      });

      it('THEN f30 is drawn with its failed outcome', () => {
        const { spec, outcomes } = lastDrawOf(rig);

        expect(spec.files.map((file) => file.id)).toContain(fileId(30));
        expect(outcomes[fileId(30)]).toBe('failed');
      });

      it('THEN f10 is gone', () => {
        expect(drawnIdsOf(rig)).not.toContain(fileId(10));
      });

      it('THEN the box keeps its 11 nodes', () => {
        expect(lastDrawOf(rig).spec.fileIds).toHaveLength(11);
      });

      it('THEN the group is collapsed and expanded once', () => {
        expect(rig.atoms.collapse).toHaveBeenCalledOnce();
        expect(rig.atoms.expand).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN f30 failed and an atoms message then passes it', () => {
      beforeEach(() => {
        groups.states(atomsOf({ [fileId(30)]: 'failed' }));
        rig.atoms.expand.mockClear();

        groups.states(atomsOf({ [fileId(30)]: 'passed' }));
      });

      it('THEN f30 is gone', () => {
        expect(drawnIdsOf(rig)).not.toContain(fileId(30));
      });

      it('THEN f10 is back', () => {
        expect(drawnIdsOf(rig)).toContain(fileId(10));
      });
    });

    it('WHEN an atoms message caches f02, which is drawn, THEN the outcomes are written without a redraw', () => {
      rig.atoms.collapse.mockClear();
      rig.atoms.expand.mockClear();

      groups.states(atomsOf({ [fileId(2)]: 'cached' }));

      expect(rig.atoms.collapse).not.toHaveBeenCalled();
      expect(rig.atoms.expand).not.toHaveBeenCalled();
      expect(rig.atoms.setOutcomes).toHaveBeenLastCalledWith({ [fileId(2)]: 'cached' });
    });

    it('WHEN a state adds f41 THEN the count node says 31 more', () => {
      rig.atoms.expand.mockClear();

      groups.received([groupOf(UMBRELLA, 41)]);

      expect(lastDrawOf(rig).spec.hidden).toBe(31);
    });

    it('WHEN a state makes f02 live THEN the group is redrawn', () => {
      rig.atoms.collapse.mockClear();
      rig.atoms.expand.mockClear();

      groups.received([withLiveFile(groupOf(UMBRELLA, 40), 2)]);

      expect(rig.atoms.collapse).toHaveBeenCalledOnce();
      expect(rig.atoms.expand).toHaveBeenCalledOnce();
    });
  });

  it('GIVEN a 40-file group left collapsed WHEN an atoms message fails f30 THEN no position is set', () => {
    rig.atoms.setPositions.mockClear();

    groups.states(atomsOf({ [fileId(30)]: 'failed' }));

    expect(rig.atoms.setPositions).not.toHaveBeenCalled();
  });
});
