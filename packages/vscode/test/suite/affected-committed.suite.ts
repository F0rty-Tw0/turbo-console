import { affectedCommittedCase } from '../utils/affected-list-cases.spec.util.ts';
import { startAffectedScene } from '../utils/affected-scene-start.spec.util.ts';
import { markDone } from '../utils/suite-env.spec.util.ts';

/**
 * L18: affected tasks (M3-2) on a `target-like` copy on branch `feat` with only a committed README change, and
 * `TURBO_SCM_BASE=HEAD` in the host env. `turbo query` ignores that variable (F10), so only the editor port passing it as
 * the base gives A7c an empty list.
 */
export const run = async (): Promise<void> => {
  const scene = await startAffectedScene('L18');

  try {
    await affectedCommittedCase(scene);
    await markDone(scene.env);
  } finally {
    scene.counter.dispose();
  }
};
