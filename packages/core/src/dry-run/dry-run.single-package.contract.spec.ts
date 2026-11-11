import { afterAll, beforeAll, expect, it } from 'vitest';

import type { DryRunRequest } from './common/dry-run-state.type.ts';
import { readDryRun } from './domain-logic/read-dry-run.ts';
import { dryRunArgs } from './utils/dry-run.util.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../binary/common/index.ts';
import { resolveTurbo } from '../binary/domain-logic/resolve-turbo.ts';
import { dryRunSchema } from '../shared/turbo/common/dry-run.schema.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import type { SinglePackageRepo } from '../shared/turbo/test/common/turbo.type.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { singlePackageRepo } from '../shared/turbo/test/utils/single-package-repo.spec.util.ts';

const TURBO = devTurboPath();
let repo: SinglePackageRepo | undefined;
let dir = '';
let binary: TurboBinary;

beforeAll(async () => {
  repo = await singlePackageRepo('dry-run-single-');
  dir = repo.dir;
  binary = await resolveTurbo(dir, { trusted: true, overridePath: TURBO });
});
afterAll(async () => {
  await repo?.dispose();
});

it('WHEN build runs dry with --single-package THEN turbo says monorepo false and lists a bare id with no package key', async () => {
  const result = await runTurbo(TURBO, ['run', 'build', '--filter=//', '--single-package', '--dry=json'], dir);
  const parsed = dryRunSchema.parse(JSON.parse(result.stdout));

  expect(result.exitCode).toBe(0);
  expect(parsed.monorepo).toBe(false);
  expect(parsed.tasks.map((task) => [task.taskId, task.package])).toStrictEqual([['build', undefined]]);
});

it('WHEN readDryRun reads build and lint for // with singlePackage true THEN the ids are //#build and //#lint with a string hash', async () => {
  const request: DryRunRequest = { tasks: ['build', 'lint'], packages: ['//'], singlePackage: true };
  const states = await readDryRun(binary, request);

  expect(states.map((state) => state.id)).toStrictEqual(['//#build', '//#lint']);
  expect(states.every((state) => typeof state.hash === 'string')).toBe(true);
});

it('WHEN build runs dry without --single-package under --skip-infer THEN turbo stays in monorepo mode and lists no task', async () => {
  const args = dryRunArgs({ tasks: ['build'], packages: ['//'] });
  const result = await runTurbo(TURBO, args, dir);
  const parsed = dryRunSchema.parse(JSON.parse(result.stdout));

  expect(result.exitCode).toBe(0);
  expect(parsed.monorepo).toBe(true);
  expect(parsed.tasks).toStrictEqual([]);
});
