import { affectedPackageListCase } from '../utils/affected-list-cases.spec.util.ts';
import { startAffectedScene } from '../utils/affected-scene-start.spec.util.ts';
import { assertNoCiEnv } from '../utils/ci-env.spec.util.ts';
import { markDone, step } from '../utils/suite-env.spec.util.ts';

/**
 * L17: affected tasks (M3-2) at turbo's package level (`futureFlags.affectedUsingTaskInputs` off) on a `target-like` copy
 * on branch `feat` with a README commit and an uncommitted leaf source edit. A3p reads the 24-task list, which holds the
 * test of the README package that the task level leaves out.
 */
export const run = async (): Promise<void> => {
  const scene = await startAffectedScene('L17');

  try {
    await step('the host env carries no CI variable', assertNoCiEnv);
    await affectedPackageListCase(scene);
    await markDone(scene.env);
  } finally {
    scene.counter.dispose();
  }
};
