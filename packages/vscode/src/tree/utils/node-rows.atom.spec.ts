import { describe, expect, it } from 'vitest';

import { childRowsOf, currentRowOf } from './node-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RowContext, TreeNode } from '../common/tree-node.type.ts';
import { ATOM_MODEL_STUB, ATOM_VIEW_STUB, A_FILE_STUB } from '../test/stubs/atom-view.stub.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { atomContextOf } from '../test/utils/atom-context.spec.util.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const STATE: RootState = { ...ROOT_STATE_STUB, model: ATOM_MODEL_STUB };

const CONTEXT: RowContext = atomContextOf(ATOM_VIEW_STUB);

const taskNodeOf = (taskId: string): TreeNode => {
  const node: TreeNode = { kind: 'task', id: `task:/ws\0${taskId}`, root: '/ws', key: taskId, packageName: 'e2e' };

  return node;
};

const UMBRELLA_NODE = taskNodeOf('e2e#e2e-ci');

const FILE_NODE = taskNodeOf(A_FILE_STUB.task.id);

describe('FEATURE: node rows under an Atomizer umbrella', () => {
  describe('GIVEN a root whose package e2e holds a group', () => {
    it('WHEN the umbrella is opened THEN its file rows are listed in spec order', () => {
      const rows = childRowsOf(STATE, UMBRELLA_NODE, CONTEXT);

      expect(rows.map((row) => row.id)).toStrictEqual([
        'task:/ws\0e2e#e2e-ci--tests/a.spec.ts',
        'task:/ws\0e2e#e2e-ci--tests/b fails.spec.ts',
        'task:/ws\0e2e#e2e-ci--tests/live.spec.ts'
      ]);
    });

    it('WHEN a plain task is opened THEN it lists nothing', () => {
      expect(childRowsOf(STATE, taskNodeOf('e2e#build'), CONTEXT)).toStrictEqual([]);
    });

    it('WHEN a file is opened THEN it lists nothing', () => {
      expect(childRowsOf(STATE, FILE_NODE, CONTEXT)).toStrictEqual([]);
    });

    it('WHEN a file row is rebuilt alone THEN it equals the listed child row', () => {
      const [listed] = childRowsOf(STATE, UMBRELLA_NODE, CONTEXT);

      expect(currentRowOf(STATE, FILE_NODE, CONTEXT)).toStrictEqual(listed);
    });
  });

  describe('GIVEN a context without groups', () => {
    it('WHEN the umbrella is opened THEN it lists nothing', () => {
      expect(childRowsOf(STATE, UMBRELLA_NODE, rowContextOf('list'))).toStrictEqual([]);
    });
  });
});
