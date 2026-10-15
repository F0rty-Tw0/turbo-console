import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { dryRunSchema, turboRunAllArgs } from '@turbo-console/core';

import { manifestTree } from './tree-walk.spec.util.ts';
import type { ShownManifest, ShownPackage } from '../common/launch.type.ts';
import type { LeafPair } from '../common/parity.type.ts';

const execFileAsync = promisify(execFile);

const DRY_RUN_LIMIT_MS = 60_000;

const DRY_RUN_BUFFER_BYTES = 64 * 1024 * 1024;

/** Whether `pkg` is a regular package no package depends on and shows a `build` task. */
const isBuildLeaf = (manifest: ShownManifest, pkg: ShownPackage): boolean => {
  const dependedOn = manifest.packages.flatMap((other) => other.dependencies);
  const isDependedOn = dependedOn.includes(pkg.name);
  const { tasks } = manifestTree(manifest);
  const ids = tasks[pkg.name] ?? [];
  const hasBuild = ids.includes(`${pkg.name}#build`);

  return pkg.role === 'regular' && !isDependedOn && hasBuild;
};

/**
 * Spec §5.3 case 8: the leaf is core's `leafPackage` rule (the first regular package nothing depends on) among those
 * that show a `build`; `other` is the next such package, outside the leaf's dependency chain.
 */
export const leafPair = (manifest: ShownManifest): LeafPair => {
  const isLeaf = (pkg: ShownPackage): boolean => isBuildLeaf(manifest, pkg);
  const [leaf, other] = manifest.packages.filter(isLeaf);

  if (leaf === undefined || other === undefined) throw new Error('the manifest has fewer than two build leaf packages');

  const pair: LeafPair = { leaf, other };

  return pair;
};

/**
 * The task ids `turbo run <task> --affected --dry=json` lists in `root`. A run all task writes no run summary, so this
 * is how the suite reads the affected set. It runs with this process's env, which the task processes share by
 * inference only: they are spawned by the pty host, and the plan's critic round 2 notes that `runTests` merges
 * `process.env` with `extensionTestsEnv` for the whole VS Code process tree. With `TURBO_SCM_BASE` and `TURBO_SCM_HEAD`
 * set, a lost base would list every task.
 */
export const affectedTaskIds = async (root: string, turboPath: string, taskName: string): Promise<string[]> => {
  const runArgs = turboRunAllArgs(taskName, { affected: true });
  const args = [...runArgs, '--dry=json'];
  const options = { cwd: root, encoding: 'utf8', maxBuffer: DRY_RUN_BUFFER_BYTES, timeout: DRY_RUN_LIMIT_MS } as const;
  const { stdout } = await execFileAsync(turboPath, args, options);
  const json: unknown = JSON.parse(stdout);
  const dryRun = dryRunSchema.parse(json);

  return dryRun.tasks.map((task) => task.taskId);
};
