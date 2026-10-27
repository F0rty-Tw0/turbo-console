import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { dirRows } from './dir-rows.util.ts';
import { DESCRIPTION_MAX } from '../../shared/common/text.const.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import type { RowInputs, RunningCounts } from '../common/tree-row.type.ts';
import { ROW_INPUTS_STUB } from '../test/stubs/tree-row.stub.ts';
import { PACKAGE_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { modelViewWith } from '../test/utils/row-context.spec.util.ts';

const packageAt = (name: string, path: string): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path };

  return pkg;
};

const PACKAGES_DIR: FolderDir = { path: 'packages', label: 'packages', dirs: [], packages: ['app'] };

/** Two runs of package `name`, counted on folder `dir` too. */
const twoRunsIn = (name: string, dir: string): RowInputs => {
  const running: RunningCounts = { packages: new Map([[name, 2]]), dirs: new Map([[dir, 2]]) };
  const inputs: RowInputs = { ...ROW_INPUTS_STUB, running };

  return inputs;
};

const descriptionsOf = (level: FolderTree, pkg: PackageNode, inputs: RowInputs): string[] => {
  const rows = dirRows('/ws', level, modelViewWith([pkg]), inputs);

  return rows.map((row) => row.description);
};

describe('FEATURE: running counts on folder and package rows', () => {
  describe('GIVEN package app at packages/app with two runs', () => {
    const app = packageAt('app', 'packages/app');

    it('WHEN its row is listed THEN the description is the path and the count', () => {
      const level: FolderTree = { dirs: [], packages: ['app'] };

      const descriptions = descriptionsOf(level, app, twoRunsIn('app', 'packages'));

      expect(descriptions).toStrictEqual(['packages/app · 2 running']);
    });

    it('WHEN its folder row is listed THEN the description is the count alone', () => {
      const level: FolderTree = { dirs: [PACKAGES_DIR], packages: [] };

      const descriptions = descriptionsOf(level, app, twoRunsIn('app', 'packages'));

      expect(descriptions).toStrictEqual(['2 running']);
    });

    it('WHEN nothing runs THEN both rows read as before', () => {
      const level: FolderTree = { dirs: [PACKAGES_DIR], packages: ['app'] };

      const descriptions = descriptionsOf(level, app, ROW_INPUTS_STUB);

      expect(descriptions).toStrictEqual(['', 'packages/app']);
    });
  });

  describe('GIVEN package docs whose path is its name, with two runs', () => {
    it('WHEN its row is listed THEN the description is the count alone', () => {
      const level: FolderTree = { dirs: [], packages: ['docs'] };

      const descriptions = descriptionsOf(level, packageAt('docs', 'docs'), twoRunsIn('docs', ''));

      expect(descriptions).toStrictEqual(['2 running']);
    });
  });

  describe('GIVEN a package path longer than the description limit, with two runs', () => {
    it('WHEN its row is listed THEN the path is cut first and the count stays whole', () => {
      const path = `p/${'d'.repeat(DESCRIPTION_MAX + 30)}`;
      const level: FolderTree = { dirs: [], packages: ['x'] };

      const descriptions = descriptionsOf(level, packageAt('x', path), twoRunsIn('x', 'p'));

      expect(descriptions).toStrictEqual([`${path.slice(0, DESCRIPTION_MAX - 1)}… · 2 running`]);
    });
  });
});
