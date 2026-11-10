import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadTrees } from './load-trees.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import { SHARED_ATOMS_STUB } from '../test/stubs/shared-atoms.stub.ts';
import { SHARED_PREDICTION_STUB } from '../test/stubs/shared-prediction.stub.ts';
import { TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';

type Forwarded = 'childrenRequested' | 'runChanged' | 'modelChanged' | 'rootsChanged' | 'refreshAll' | 'dispose';

type ForwardCase = {
  readonly method: Forwarded;
  readonly call: (trees: LoadTrees) => void;
  readonly args: unknown[];
};

const CHANGE: RootChange = { root: '/ws', before: null, after: null, errorBefore: null, errorAfter: null };

const FORWARD_CASES: ForwardCase[] = [
  { method: 'childrenRequested', call: (trees) => trees.childrenRequested(TREE_NODE_STUB), args: [TREE_NODE_STUB] },
  { method: 'runChanged', call: (trees) => trees.runChanged(RUN_ENTRY_STUB), args: [RUN_ENTRY_STUB] },
  { method: 'modelChanged', call: (trees) => trees.modelChanged(CHANGE), args: [CHANGE] },
  { method: 'rootsChanged', call: (trees) => trees.rootsChanged(), args: [] },
  { method: 'refreshAll', call: (trees) => trees.refreshAll(), args: [] },
  { method: 'dispose', call: (trees) => trees.dispose(), args: [] }
];

describe('FEATURE: load trees', () => {
  let trees: LoadTrees;

  beforeEach(() => {
    const cache = new Map<string, TreeNode>();
    const ports = { atom: SHARED_ATOMS_STUB, prediction: SHARED_PREDICTION_STUB, fire: vi.fn() };

    trees = new LoadTrees(new RootStore(), cache, ports);
  });

  describe('GIVEN load trees over an empty store', () => {
    it.each(FORWARD_CASES)('WHEN $method is called THEN the atom tree gets it with the same arguments', ({ method, call, args }) => {
      const atoms = vi.spyOn(trees.atoms, method).mockReturnValue(undefined);

      call(trees);

      expect(atoms).toHaveBeenCalledExactlyOnceWith(...args);
    });

    it.each(FORWARD_CASES)(
      'WHEN $method is called THEN the prediction tree gets it with the same arguments',
      ({ method, call, args }) => {
        const prediction = vi.spyOn(trees.prediction, method).mockReturnValue(undefined);

        call(trees);

        expect(prediction).toHaveBeenCalledExactlyOnceWith(...args);
      }
    );
  });
});
