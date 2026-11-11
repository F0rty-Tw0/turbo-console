import { affectedFailedCase } from '../utils/affected-failed-cases.spec.util.ts';
import { startAffectedScene } from '../utils/affected-scene-start.spec.util.ts';
import { markDone } from '../utils/suite-env.spec.util.ts';

/**
 * L16: affected tasks (M3-2) on a `target-like` copy without its `.git`, real VS Code and real turbo. `turbo ls` and a
 * dry run work there, `turbo query affectedTasks` does not, so the root reads Failed: A6 checks the view description, the
 * rows and that a redraw does not spawn the query again.
 */
export const run = async (): Promise<void> => {
  const scene = await startAffectedScene('L16');

  try {
    await affectedFailedCase(scene);
    await markDone(scene.env);
  } finally {
    scene.counter.dispose();
  }
};
