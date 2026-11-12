import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { loadWorkspace, resolveTurbo, turboRunArgs } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { PackageNode, TaskNode, WorkspaceModel } from '../index.ts';
import { writeMonorepoRootFixture } from './test/utils/monorepo-root-fixture.spec.util.ts';
import type { TurboResult } from '../shared/turbo/common/turbo.type.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';

type TaskRow = [id: string, isTurboTask: boolean];

const TRUSTED = { trusted: true } as const;

const rootOf = (model: WorkspaceModel): PackageNode | undefined => model.packages.find((pkg) => pkg.name === '//');

/** The root's task named `name`; throws when the model lacks it, so the run case fails on the load, not on turbo. */
const rootTaskOf = (model: WorkspaceModel, name: string): TaskNode => {
  const task = rootOf(model)?.tasks.find((candidate) => candidate.name === name);

  if (task === undefined) throw new Error(`the model has no //#${name}`);

  return task;
};

const taskRowsOf = (pkg: PackageNode | undefined): TaskRow[] => {
  const tasks = pkg?.tasks ?? [];

  return tasks.map((task): TaskRow => [task.id, task.isTurboTask]);
};

describe('FEATURE: the root package of a monorepo from a real turbo', () => {
  let tempDir = '';
  let root = '';
  let model: WorkspaceModel;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'monorepo-root-contract-'));
    root = await writeMonorepoRootFixture(tempDir);

    const binary = await resolveTurbo(root, { ...TRUSTED, overridePath: devTurboPath() });

    model = await loadWorkspace(binary);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN apps/web and libs/ui beside root scripts lint, format and build, only lint keyed //#lint', () => {
    it('WHEN loaded THEN the root // is listed first, beside ui and web, in monorepo mode', () => {
      expect(model.singlePackage).toBe(false);
      expect(model.packages.map((pkg) => pkg.name)).toStrictEqual(['//', 'ui', 'web']);
    });

    it('WHEN loaded THEN the root sits at path "" and reads its package.json name', () => {
      expect(rootOf(model)).toMatchObject({ path: '', label: 'root-fixture' });
    });

    it('WHEN loaded THEN //#lint is a turbo task and the unkeyed build and format are plain scripts', () => {
      expect(taskRowsOf(rootOf(model))).toStrictEqual([
        ['//#build', false],
        ['//#format', false],
        ['//#lint', true]
      ]);
    });

    it('WHEN //#lint runs with the turbo run args for the // package THEN turbo runs the root lint script', async () => {
      const args = turboRunArgs(rootTaskOf(model, 'lint'), '//').slice(1);
      const result: TurboResult = await runTurbo(devTurboPath(), args, root);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('root-lint');
    });
  });
});
