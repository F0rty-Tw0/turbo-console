import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { atomFoldOf } from './graph-atoms.util.ts';
import {
  APP_BUILD_TASK_STUB,
  ATOM_AGGREGATE_TASK_STUB,
  ATOM_E2E_PACKAGE_STUB,
  ATOM_FILE_A_TASK_STUB,
  ATOM_FILE_B_TASK_STUB,
  ATOM_UMBRELLA_TASK_STUB,
  GRAPH_ATOM_MODEL_STUB
} from '../test/stubs/graph-atom-model.stub.ts';
import { GRAPH_MODEL_STUB } from '../test/stubs/graph-model.stub.ts';

const UMBRELLA_ID = ATOM_UMBRELLA_TASK_STUB.id;
const AGGREGATE_ID = ATOM_AGGREGATE_TASK_STUB.id;
const FILE_A = ATOM_FILE_A_TASK_STUB.id;
const FILE_B = ATOM_FILE_B_TASK_STUB.id;

describe('FEATURE: atom fold of a model', () => {
  describe('GIVEN a model with one Atomizer group', () => {
    const fold = atomFoldOf(GRAPH_ATOM_MODEL_STUB);

    it('WHEN folded THEN the group is the core group', () => {
      expect(fold.groups.map((group) => group.umbrella.id)).toStrictEqual([UMBRELLA_ID]);
    });

    it('WHEN folded THEN the aggregate and every file map to the umbrella', () => {
      expect(Object.fromEntries(fold.umbrellaOf)).toStrictEqual({
        [AGGREGATE_ID]: UMBRELLA_ID,
        [FILE_A]: UMBRELLA_ID,
        [FILE_B]: UMBRELLA_ID
      });
    });

    it('WHEN folded THEN only the aggregate is hidden', () => {
      expect(Array.from(fold.hidden)).toStrictEqual([AGGREGATE_ID]);
    });

    it('WHEN folded THEN the umbrella carries the raw dependencies of the aggregate and the files', () => {
      expect(fold.foldedOf.get(UMBRELLA_ID)).toStrictEqual([FILE_A, FILE_B, APP_BUILD_TASK_STUB.id, APP_BUILD_TASK_STUB.id, FILE_A]);
    });
  });

  describe('GIVEN a group without an aggregate task', () => {
    const pkg: PackageNode = { ...ATOM_E2E_PACKAGE_STUB, tasks: [ATOM_UMBRELLA_TASK_STUB, ATOM_FILE_A_TASK_STUB] };
    const model: WorkspaceModel = { ...GRAPH_ATOM_MODEL_STUB, packages: [pkg] };
    const fold = atomFoldOf(model);

    it('WHEN folded THEN nothing is hidden', () => {
      expect(fold.hidden.size).toBe(0);
    });

    it('WHEN folded THEN the umbrella carries the dependencies of the file only', () => {
      expect(fold.foldedOf.get(UMBRELLA_ID)).toStrictEqual([APP_BUILD_TASK_STUB.id]);
    });
  });

  describe('GIVEN a model with no Atomizer group', () => {
    it('WHEN folded THEN nothing maps, hides or folds', () => {
      const fold = atomFoldOf(GRAPH_MODEL_STUB);

      expect([fold.groups, fold.umbrellaOf.size, fold.hidden.size, fold.foldedOf.size]).toStrictEqual([[], 0, 0, 0]);
    });
  });
});
