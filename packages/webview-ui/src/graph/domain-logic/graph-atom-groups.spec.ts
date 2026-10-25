import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { BASE, E2E_CI, LIB_CI, SIZES, TASKS, atomRigOf, statesOf } from '../test/utils/graph-atom-groups.spec.util.ts';

const COUNTED_E2E_CI = statesOf('app#e2e-ci', '10 files · 3 cached');

const UNKNOWN_GONE = statesOf('gone#e2e-ci', '5 files');

const COUNTED_LIB_CI = statesOf('lib#e2e-ci', '2 files · 1 failed');

const SHOWN_E2E_CI = { type: 'shownUmbrellas', ids: ['app#e2e-ci'] };

describe('FEATURE: Atomizer groups of the task graph', () => {
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  beforeEach(() => {
    rig = atomRigOf();
    groups = new GraphAtomGroups(rig.deps);
  });

  describe('GIVEN no group received', () => {
    it('WHEN atoms arrive THEN nothing is drawn and nothing throws', () => {
      groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).not.toHaveBeenCalled();
      expect(groups.labels().size).toBe(0);
    });

    it('WHEN atoms arrive and the group follows THEN its label is its file count, not those counts', () => {
      groups.states(COUNTED_E2E_CI);
      groups.received([E2E_CI]);

      const labels = groups.labels();

      expect([...labels]).toStrictEqual([['app#e2e-ci', '10 files']]);
    });
  });

  describe('GIVEN two groups received', () => {
    beforeEach(() => {
      groups.received([LIB_CI, E2E_CI]);
    });

    it('WHEN the file counts are read THEN each umbrella has its file count', () => {
      const counts = groups.fileCounts();

      expect([...counts]).toStrictEqual([
        ['lib#e2e-ci', 2],
        ['app#e2e-ci', 10]
      ]);
    });

    it('WHEN the labels are read before any atoms THEN each is its file count in files', () => {
      const labels = groups.labels();

      expect([...labels]).toStrictEqual([
        ['lib#e2e-ci', '2 files'],
        ['app#e2e-ci', '10 files']
      ]);
    });

    it('WHEN atoms name a known and an unknown umbrella THEN only the known one keeps its counts', () => {
      const both = { ...COUNTED_E2E_CI, ...UNKNOWN_GONE };

      groups.states(both);

      const labels = groups.labels();

      expect([...labels]).toStrictEqual([
        ['lib#e2e-ci', '2 files'],
        ['app#e2e-ci', '10 files · 3 cached']
      ]);
    });

    it('WHEN the groups are received again without one THEN its counts are forgotten', () => {
      groups.states(COUNTED_LIB_CI);
      groups.received([E2E_CI]);
      groups.received([LIB_CI, E2E_CI]);

      expect(groups.labels().get('lib#e2e-ci')).toBe('2 files');
    });

    it('WHEN the same groups are received again THEN their counts are kept', () => {
      groups.states(COUNTED_E2E_CI);
      groups.received([LIB_CI, E2E_CI]);

      expect(groups.labels().get('app#e2e-ci')).toBe('10 files · 3 cached');
    });

    it('WHEN atoms arrive before any layout is placed THEN the canvas is not touched', () => {
      groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a layout is placed with the umbrella', () => {
    beforeEach(() => {
      groups.received([E2E_CI]);
      groups.placed(new Set(['app#e2e-ci']), BASE, SIZES, TASKS);
    });

    it('WHEN atoms arrive for it THEN setCounts gets its counts without the name', () => {
      groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).toHaveBeenCalledExactlyOnceWith(new Map([['app#e2e-ci', '10 files · 3 cached']]));
    });

    it('WHEN atoms arrive for it THEN no position is set', () => {
      groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setPositions).not.toHaveBeenCalled();
    });

    it('WHEN the group is received and placed again THEN a later atoms message keeps the counts it had', () => {
      groups.states(COUNTED_E2E_CI);
      groups.received([E2E_CI]);
      groups.placed(new Set(['app#e2e-ci']), BASE, SIZES, TASKS);

      groups.states(UNKNOWN_GONE);

      expect(rig.tasks.setCounts).toHaveBeenLastCalledWith(new Map([['app#e2e-ci', '10 files · 3 cached']]));
    });

    it('WHEN atoms name an unknown umbrella THEN the counts it has are unchanged', () => {
      groups.states(UNKNOWN_GONE);

      expect(rig.tasks.setCounts).toHaveBeenCalledExactlyOnceWith(new Map([['app#e2e-ci', '10 files']]));
    });
  });

  describe('GIVEN a layout is placed where one known umbrella is a plain-sized task', () => {
    beforeEach(() => {
      groups.received([LIB_CI, E2E_CI]);
      groups.placed(new Set(['app#e2e-ci', 'lib#e2e-ci']), BASE, SIZES, TASKS);
    });

    it('WHEN atoms name both THEN setCounts gets only the umbrella the layout sized', () => {
      const both = { ...COUNTED_E2E_CI, ...COUNTED_LIB_CI };

      groups.states(both);

      expect(rig.tasks.setCounts).toHaveBeenCalledExactlyOnceWith(new Map([['app#e2e-ci', '10 files · 3 cached']]));
    });
  });

  describe('GIVEN a layout is placed', () => {
    it('WHEN two umbrellas are shown THEN shownUmbrellas posts both ids once, sorted', () => {
      groups.received([LIB_CI, E2E_CI]);

      groups.placed(new Set(['lib#e2e-ci', 'app#e2e-ci', 'app#build']), BASE, SIZES, TASKS);

      expect(rig.post.mock.calls).toStrictEqual([[{ type: 'shownUmbrellas', ids: ['app#e2e-ci', 'lib#e2e-ci'] }]]);
    });

    it('WHEN no umbrella is shown THEN nothing is posted', () => {
      groups.received([E2E_CI]);

      groups.placed(new Set(['app#build']), BASE, new Map(), TASKS);

      expect(rig.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN reshown', () => {
    it('WHEN it follows a placement with a shown umbrella THEN shownUmbrellas posts its id again', () => {
      groups.received([E2E_CI]);
      groups.placed(new Set(['app#e2e-ci']), BASE, SIZES, TASKS);

      groups.reshown();

      expect(rig.post.mock.calls).toStrictEqual([[SHOWN_E2E_CI], [SHOWN_E2E_CI]]);
    });

    it('WHEN it comes before any placement THEN nothing is posted', () => {
      groups.received([E2E_CI]);

      groups.reshown();

      expect(rig.post).not.toHaveBeenCalled();
    });

    it('WHEN it follows a placement with no umbrella shown THEN nothing is posted', () => {
      groups.received([E2E_CI]);
      groups.placed(new Set(['app#build']), BASE, new Map(), TASKS);

      groups.reshown();

      expect(rig.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the layout is cleared', () => {
    beforeEach(() => {
      groups.received([E2E_CI]);
      groups.placed(new Set(['app#e2e-ci']), BASE, SIZES, TASKS);
      rig.post.mockClear();
      groups.clear();
    });

    it('WHEN atoms arrive after it THEN the canvas is not touched', () => {
      groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).not.toHaveBeenCalled();
    });

    it('WHEN reshown follows it THEN nothing is posted', () => {
      groups.reshown();

      expect(rig.post).not.toHaveBeenCalled();
    });
  });
});
