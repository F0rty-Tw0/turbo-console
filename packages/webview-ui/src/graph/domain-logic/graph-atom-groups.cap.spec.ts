import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { GraphAtomGroupState, GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomFile, GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { BASE, SIZES, TASKS, atomRigOf, groupOf } from '../test/utils/graph-atom-groups.spec.util.ts';

const UMBRELLA = 'app#e2e-ci';

const MORE_ID = `atom-more:${UMBRELLA}`;

const SHOWN = new Set([UMBRELLA]);

/** The id of the file at `position` of a group, counting from 1: `app#e2e-ci--0.spec.ts` is the first. */
const fileId = (position: number): string => `${UMBRELLA}--${position - 1}.spec.ts`;

const F02 = fileId(2);

const F10 = fileId(10);

const F30 = fileId(30);

const F02_CACHED = { [F02]: 'cached' } as const;

const F30_FAILED = { [F30]: 'failed' } as const;

const F30_PASSED = { [F30]: 'passed' } as const;

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
  const markLive = (file: GraphAtomFile): GraphAtomFile => {
    const isLive = file.id === liveId;

    if (!isLive) return file;

    const live = { ...file, isLive: true };

    return live;
  };
  const files = group.files.map(markLive);
  const marked = { ...group, files };

  return marked;
};

describe('FEATURE: a capped Atomizer group toggled by its count node and redrawn when its drawn files change', () => {
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  const placeGroup = (fileCount: number): void => {
    groups.received([groupOf(UMBRELLA, fileCount)]);
    groups.placed(SHOWN, BASE, SIZES, TASKS);
  };

  beforeEach(() => {
    rig = atomRigOf();
    groups = new GraphAtomGroups(rig.deps);
  });

  describe('GIVEN a 12-file group expanded', () => {
    beforeEach(() => {
      placeGroup(12);
      groups.toggle(UMBRELLA);
    });

    it('WHEN the count node is double tapped THEN the group collapses', () => {
      rig.atoms.collapse.mockClear();

      groups.toggle(MORE_ID);

      expect(rig.atoms.collapse).toHaveBeenCalledExactlyOnceWith(UMBRELLA, 'pkg:app');
    });

    describe('WHEN the count node of an unknown umbrella is double tapped', () => {
      beforeEach(() => {
        rig.atoms.collapse.mockClear();
        rig.atoms.expand.mockClear();

        groups.toggle('atom-more:unknown#x');
      });

      it('THEN nothing collapses', () => {
        expect(rig.atoms.collapse).not.toHaveBeenCalled();
      });

      it('THEN nothing expands', () => {
        expect(rig.atoms.expand).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a 40-file group expanded with no outcomes', () => {
    beforeEach(() => {
      placeGroup(40);
      groups.toggle(UMBRELLA);
    });

    describe('WHEN an atoms message fails f30, which is not drawn', () => {
      beforeEach(() => {
        rig.atoms.collapse.mockClear();
        rig.atoms.expand.mockClear();

        groups.states(atomsOf(F30_FAILED));
      });

      it('THEN f30 is drawn', () => {
        expect(drawnIdsOf(rig)).toContain(F30);
      });

      it('THEN f30 is drawn with its failed outcome', () => {
        expect(lastDrawOf(rig).outcomes[F30]).toBe('failed');
      });

      it('THEN f10 is gone', () => {
        expect(drawnIdsOf(rig)).not.toContain(F10);
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
        groups.states(atomsOf(F30_FAILED));
        rig.atoms.expand.mockClear();

        groups.states(atomsOf(F30_PASSED));
      });

      it('THEN f30 is gone', () => {
        expect(drawnIdsOf(rig)).not.toContain(F30);
      });

      it('THEN f10 is back', () => {
        expect(drawnIdsOf(rig)).toContain(F10);
      });
    });

    describe('WHEN an atoms message caches f02, which is drawn', () => {
      beforeEach(() => {
        rig.atoms.collapse.mockClear();
        rig.atoms.expand.mockClear();

        groups.states(atomsOf(F02_CACHED));
      });

      it('THEN the group is not collapsed', () => {
        expect(rig.atoms.collapse).not.toHaveBeenCalled();
      });

      it('THEN the group is not expanded again', () => {
        expect(rig.atoms.expand).not.toHaveBeenCalled();
      });

      it('THEN the outcome is written', () => {
        expect(rig.atoms.setOutcomes).toHaveBeenLastCalledWith(F02_CACHED);
      });
    });

    it('WHEN a state adds f41 THEN the count node says 31 more', () => {
      rig.atoms.expand.mockClear();

      groups.received([groupOf(UMBRELLA, 41)]);

      expect(lastDrawOf(rig).spec.hidden).toBe(31);
    });

    it('WHEN a state makes f02 live THEN the group is redrawn', () => {
      const live = withLiveFile(groupOf(UMBRELLA, 40), 2);

      rig.atoms.collapse.mockClear();
      rig.atoms.expand.mockClear();

      groups.received([live]);

      expect(rig.atoms.collapse).toHaveBeenCalledOnce();
      expect(rig.atoms.expand).toHaveBeenCalledOnce();
    });
  });

  it('GIVEN a 40-file group left collapsed WHEN an atoms message fails f30 THEN no position is set', () => {
    placeGroup(40);
    rig.atoms.setPositions.mockClear();

    groups.states(atomsOf(F30_FAILED));

    expect(rig.atoms.setPositions).not.toHaveBeenCalled();
  });
});
