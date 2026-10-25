import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mocked } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { GraphAtomGroupState } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomGroupsDeps } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas } from '../common/task-canvas.type.ts';
import { taskCanvasMock } from '../test/mocks/graph-view.mock.ts';

const SIZE: NodeSize = { width: 200, height: 48 };

const SIZES = new Map([['app#e2e-ci', SIZE]]);

const E2E_CI_AT = { x: 10, y: 20 };

const BASE: Positions = { 'app#e2e-ci': E2E_CI_AT };

const statesOf = (umbrellaId: string, counts: string): Record<string, GraphAtomGroupState> => {
  const state: GraphAtomGroupState = { counts, files: {} };
  const states = { [umbrellaId]: state };

  return states;
};

const COUNTED_E2E_CI = statesOf('app#e2e-ci', '10 files · 3 cached');

const UNKNOWN_GONE = statesOf('gone#e2e-ci', '5 files');

const COUNTED_LIB_CI = statesOf('lib#e2e-ci', '2 files · 1 failed');

const SHOWN_E2E_CI = { type: 'shownUmbrellas', ids: ['app#e2e-ci'] };

const groupOf = (umbrellaId: string, fileCount: number): GraphAtomGroup => {
  const makeFile = (_value: unknown, index: number): GraphAtomGroup['files'][number] => {
    const file = { id: `${umbrellaId}--${index}.spec.ts`, specPath: `${index}.spec.ts`, isLive: false };

    return file;
  };
  const files = Array.from({ length: fileCount }, makeFile);
  const group: GraphAtomGroup = { umbrellaId, files };

  return group;
};

const E2E_CI = groupOf('app#e2e-ci', 10);

const LIB_CI = groupOf('lib#e2e-ci', 2);

type Rig = {
  readonly groups: GraphAtomGroups;
  readonly tasks: Mocked<TaskCanvas>;
  readonly post: ReturnType<typeof vi.fn<AtomGroupsDeps['bridge']['post']>>;
};

const rigOf = (): Rig => {
  const tasks = taskCanvasMock();
  const post = vi.fn<AtomGroupsDeps['bridge']['post']>();
  const view = { tasks };
  const bridge = { post };
  const deps: AtomGroupsDeps = { view, bridge };
  const groups = new GraphAtomGroups(deps);
  const rig: Rig = { groups, tasks, post };

  return rig;
};

describe('FEATURE: Atomizer groups of the task graph', () => {
  let rig: Rig;

  beforeEach(() => {
    rig = rigOf();
  });

  describe('GIVEN no group received', () => {
    it('WHEN atoms arrive THEN nothing is drawn and nothing throws', () => {
      rig.groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).not.toHaveBeenCalled();
      expect(rig.groups.labels().size).toBe(0);
    });

    it('WHEN atoms arrive and the group follows THEN its label is its file count, not those counts', () => {
      rig.groups.states(COUNTED_E2E_CI);
      rig.groups.received([E2E_CI]);

      const labels = rig.groups.labels();

      expect([...labels]).toStrictEqual([['app#e2e-ci', '10 files']]);
    });
  });

  describe('GIVEN two groups received', () => {
    beforeEach(() => {
      rig.groups.received([LIB_CI, E2E_CI]);
    });

    it('WHEN the file counts are read THEN each umbrella has its file count', () => {
      const counts = rig.groups.fileCounts();

      expect([...counts]).toStrictEqual([
        ['lib#e2e-ci', 2],
        ['app#e2e-ci', 10]
      ]);
    });

    it('WHEN the labels are read before any atoms THEN each is its file count in files', () => {
      const labels = rig.groups.labels();

      expect([...labels]).toStrictEqual([
        ['lib#e2e-ci', '2 files'],
        ['app#e2e-ci', '10 files']
      ]);
    });

    it('WHEN atoms name a known and an unknown umbrella THEN only the known one keeps its counts', () => {
      const both = { ...COUNTED_E2E_CI, ...UNKNOWN_GONE };

      rig.groups.states(both);

      const labels = rig.groups.labels();

      expect([...labels]).toStrictEqual([
        ['lib#e2e-ci', '2 files'],
        ['app#e2e-ci', '10 files · 3 cached']
      ]);
    });

    it('WHEN the groups are received again without one THEN its counts are forgotten', () => {
      rig.groups.states(COUNTED_LIB_CI);
      rig.groups.received([E2E_CI]);
      rig.groups.received([LIB_CI, E2E_CI]);

      expect(rig.groups.labels().get('lib#e2e-ci')).toBe('2 files');
    });

    it('WHEN the same groups are received again THEN their counts are kept', () => {
      rig.groups.states(COUNTED_E2E_CI);
      rig.groups.received([LIB_CI, E2E_CI]);

      expect(rig.groups.labels().get('app#e2e-ci')).toBe('10 files · 3 cached');
    });

    it('WHEN atoms arrive before any layout is placed THEN the canvas is not touched', () => {
      rig.groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a layout is placed with the umbrella', () => {
    beforeEach(() => {
      rig.groups.received([E2E_CI]);
      rig.groups.placed(new Set(['app#e2e-ci']), BASE, SIZES);
    });

    it('WHEN atoms arrive for it THEN setCounts gets its counts without the name', () => {
      rig.groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).toHaveBeenCalledExactlyOnceWith(new Map([['app#e2e-ci', '10 files · 3 cached']]));
    });

    it('WHEN atoms arrive for it THEN no position is set', () => {
      rig.groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setPositions).not.toHaveBeenCalled();
    });

    it('WHEN the group is received and placed again THEN a later atoms message keeps the counts it had', () => {
      rig.groups.states(COUNTED_E2E_CI);
      rig.groups.received([E2E_CI]);
      rig.groups.placed(new Set(['app#e2e-ci']), BASE, SIZES);

      rig.groups.states(UNKNOWN_GONE);

      expect(rig.tasks.setCounts).toHaveBeenLastCalledWith(new Map([['app#e2e-ci', '10 files · 3 cached']]));
    });

    it('WHEN atoms name an unknown umbrella THEN the counts it has are unchanged', () => {
      rig.groups.states(UNKNOWN_GONE);

      expect(rig.tasks.setCounts).toHaveBeenCalledExactlyOnceWith(new Map([['app#e2e-ci', '10 files']]));
    });
  });

  describe('GIVEN a layout is placed where one known umbrella is a plain-sized task', () => {
    beforeEach(() => {
      rig.groups.received([LIB_CI, E2E_CI]);
      rig.groups.placed(new Set(['app#e2e-ci', 'lib#e2e-ci']), BASE, SIZES);
    });

    it('WHEN atoms name both THEN setCounts gets only the umbrella the layout sized', () => {
      const both = { ...COUNTED_E2E_CI, ...COUNTED_LIB_CI };

      rig.groups.states(both);

      expect(rig.tasks.setCounts).toHaveBeenCalledExactlyOnceWith(new Map([['app#e2e-ci', '10 files · 3 cached']]));
    });
  });

  describe('GIVEN a layout is placed', () => {
    it('WHEN two umbrellas are shown THEN shownUmbrellas posts both ids once, sorted', () => {
      rig.groups.received([LIB_CI, E2E_CI]);

      rig.groups.placed(new Set(['lib#e2e-ci', 'app#e2e-ci', 'app#build']), BASE, SIZES);

      expect(rig.post.mock.calls).toStrictEqual([[{ type: 'shownUmbrellas', ids: ['app#e2e-ci', 'lib#e2e-ci'] }]]);
    });

    it('WHEN no umbrella is shown THEN nothing is posted', () => {
      rig.groups.received([E2E_CI]);

      rig.groups.placed(new Set(['app#build']), BASE, new Map());

      expect(rig.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN reshown', () => {
    it('WHEN it follows a placement with a shown umbrella THEN shownUmbrellas posts its id again', () => {
      rig.groups.received([E2E_CI]);
      rig.groups.placed(new Set(['app#e2e-ci']), BASE, SIZES);

      rig.groups.reshown();

      expect(rig.post.mock.calls).toStrictEqual([[SHOWN_E2E_CI], [SHOWN_E2E_CI]]);
    });

    it('WHEN it comes before any placement THEN nothing is posted', () => {
      rig.groups.received([E2E_CI]);

      rig.groups.reshown();

      expect(rig.post).not.toHaveBeenCalled();
    });

    it('WHEN it follows a placement with no umbrella shown THEN nothing is posted', () => {
      rig.groups.received([E2E_CI]);
      rig.groups.placed(new Set(['app#build']), BASE, new Map());

      rig.groups.reshown();

      expect(rig.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the layout is cleared', () => {
    beforeEach(() => {
      rig.groups.received([E2E_CI]);
      rig.groups.placed(new Set(['app#e2e-ci']), BASE, SIZES);
      rig.post.mockClear();
      rig.groups.clear();
    });

    it('WHEN atoms arrive after it THEN the canvas is not touched', () => {
      rig.groups.states(COUNTED_E2E_CI);

      expect(rig.tasks.setCounts).not.toHaveBeenCalled();
    });

    it('WHEN reshown follows it THEN nothing is posted', () => {
      rig.groups.reshown();

      expect(rig.post).not.toHaveBeenCalled();
    });
  });
});
