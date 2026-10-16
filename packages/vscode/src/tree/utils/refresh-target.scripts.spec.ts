import type {
  PackageManager,
  PackageManagerName,
  PackageManagerSource,
  PackageNode,
  TaskNode,
  WorkspaceModel
} from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { refreshTarget } from './refresh-target.util.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { LiveIds } from '../../run/common/run.type.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { liveIdsOf } from '../test/utils/live-ids.spec.util.ts';

const SCRIPT: TaskNode = { ...TASK_NODE_STUB, id: 's#lint', name: 'lint', isTurboTask: false };

const packageOf = (tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name: 's', path: 'packages/s', tasks };

  return pkg;
};

const modelOf = (packages: PackageNode[], packageManager = WORKSPACE_MODEL_STUB.packageManager): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages, packageManager };

  return model;
};

const changeOf = (before: WorkspaceModel, after: WorkspaceModel, root = '/ws'): RootChange => {
  const change: RootChange = { root, before, after, errorBefore: null, errorAfter: null };

  return change;
};

const NOTHING_LIVE: LiveIds = () => new Set();

const WITH_TURBO_TASK = modelOf([packageOf([TASK_NODE_STUB, SCRIPT])]);

const SCRIPT_ONLY = modelOf([packageOf([SCRIPT])]);

const LOSES_TURBO_TASK = changeOf(WITH_TURBO_TASK, SCRIPT_ONLY);

const FIELD_SOURCE: PackageManagerSource = { kind: 'field' };

const DEV_ENGINES_SOURCE: PackageManagerSource = { kind: 'devEngines' };

const NPM_LOCKFILE: PackageManagerSource = { kind: 'lockfile', file: 'package-lock.json' };

const BUN_LOCKFILE: PackageManagerSource = { kind: 'lockfile', file: 'bun.lock' };

const managerOf = (name: PackageManagerName, source: PackageManagerSource): PackageManager => {
  const manager: PackageManager = { name, source };

  return manager;
};

/** Two models with the same package and the given managers: the only difference between them. */
const managerChange = (before: PackageManager, after: PackageManager): RootChange => {
  const packages = [packageOf([TASK_NODE_STUB])];

  return changeOf(modelOf(packages, before), modelOf(packages, after));
};

describe('FEATURE: refresh target with scripts', () => {
  describe('GIVEN an edit that removes the last turbo task of a package that keeps a script', () => {
    it('WHEN scripts are hidden THEN the root is redrawn', () => {
      const target = refreshTarget(LOSES_TURBO_TASK, false, NOTHING_LIVE);

      expect(target).toBe('root');
    });

    it('WHEN scripts are shown THEN only the package is redrawn', () => {
      const target = refreshTarget(LOSES_TURBO_TASK, true, NOTHING_LIVE);

      expect(target).toStrictEqual(['s']);
    });

    it('WHEN scripts are hidden and a script of the package is live THEN only the package is redrawn', () => {
      const target = refreshTarget(LOSES_TURBO_TASK, false, liveIdsOf('/ws', 's#lint'));

      expect(target).toStrictEqual(['s']);
    });

    it('WHEN the live script is under another root THEN the root is redrawn', () => {
      const target = refreshTarget(LOSES_TURBO_TASK, false, liveIdsOf('/other', 's#lint'));

      expect(target).toBe('root');
    });

    it('WHEN the change names a root whose runs are live THEN that root key is read', () => {
      const change = changeOf(WITH_TURBO_TASK, SCRIPT_ONLY, '/other');
      const target = refreshTarget(change, false, liveIdsOf('/other', 's#lint'));

      expect(target).toStrictEqual(['s']);
    });
  });

  describe('GIVEN an edit that changes the package manager of the model', () => {
    const PNPM = managerOf('pnpm', FIELD_SOURCE);

    it.each([
      { given: 'its name', after: managerOf('npm', FIELD_SOURCE) },
      { given: 'its source kind', after: managerOf('pnpm', DEV_ENGINES_SOURCE) }
    ])('WHEN $given changes THEN the root is redrawn', ({ after }) => {
      const target = refreshTarget(managerChange(PNPM, after), true, NOTHING_LIVE);

      expect(target).toBe('root');
    });

    it('WHEN only its lockfile changes THEN the root is redrawn', () => {
      const change = managerChange(managerOf('npm', NPM_LOCKFILE), managerOf('npm', BUN_LOCKFILE));
      const target = refreshTarget(change, true, NOTHING_LIVE);

      expect(target).toBe('root');
    });

    it('WHEN it is the same in a new object THEN nothing is redrawn', () => {
      const target = refreshTarget(managerChange(PNPM, managerOf('pnpm', FIELD_SOURCE)), true, NOTHING_LIVE);

      expect(target).toStrictEqual([]);
    });
  });
});
