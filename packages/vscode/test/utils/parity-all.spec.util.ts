import assert from 'node:assert/strict';

import { turboRunAllArgs } from '@turbo-console/core';
import { applyEdit } from '@turbo-console/repo-gen';

import { affectedTaskIds } from './parity-affected.spec.util.ts';
import { buildId, buildStepOf, runPicked } from './parity-pick.spec.util.ts';
import { finishedAllRun, watchAllRun } from './parity-run.spec.util.ts';
import { log, step } from './suite-env.spec.util.ts';
import { BUILD_TASK } from '../common/parity.const.ts';
import type { ParityScene } from '../common/parity.type.ts';

/** Runs `command` (a run all entry point) with `build` picked; asserts its task's process args and a clean exit. */
const allRunCase = async (scene: ParityScene, command: string, affected: boolean): Promise<void> => {
  const watch = watchAllRun(scene.root, BUILD_TASK, affected);
  const name = affected ? 'run affected' : 'run everywhere';

  try {
    await runPicked(command, [buildStepOf(scene.manifest)], scene.budgetFactor);

    const [args, code] = await finishedAllRun(watch, name);

    assert.deepEqual(args, turboRunAllArgs(BUILD_TASK, { affected }));
    assert.equal(code, 0, `${name} exited ${code}`);
  } finally {
    watch.dispose();
  }
};

export const everywhereCase = async (scene: ParityScene): Promise<void> => {
  await step('8: Run Task in All Packages… starts turbo run <task> over every package', async () => {
    await allRunCase(scene, 'turboConsole.runEverywhere', false);
  });
};

/**
 * The leaf's README is committed as `HEAD` (it is no keyed file, so nothing needs restoring), and `TURBO_SCM_BASE` pins
 * `HEAD~1` as the base. The run all task writes no run summary (spec §4.6.5), so the affected set comes from a dry run
 * of the same command in this env: the leaf's `build` is in it and the other leaf's is not, which a lost base (turbo
 * then calls everything affected) would break. The real run's args and exit are asserted as in `everywhereCase`.
 */
export const affectedCase = async (scene: ParityScene): Promise<void> => {
  const { pair, root, turboPath } = scene;

  await step('8: Run Affected starts turbo run <task> --affected; turbo here sees only the leaf as affected', async () => {
    await applyEdit(root, [`${pair.leaf.path}/README.md`]);
    await allRunCase(scene, 'turboConsole.runAffected', true);

    const ids = await affectedTaskIds(root, turboPath, BUILD_TASK);

    log(`affected: ${ids.length} tasks`);
    assert.ok(ids.includes(buildId(pair.leaf)), `the affected tasks lack ${buildId(pair.leaf)}`);
    assert.ok(!ids.includes(buildId(pair.other)), `the affected tasks hold ${buildId(pair.other)}`);
  });
};
