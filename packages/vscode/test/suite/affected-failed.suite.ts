import type { AffectedScene } from '../common/affected.type.ts';
import { affectedEditsOf } from '../utils/affected-edits.spec.util.ts';
import { affectedFailedCase } from '../utils/affected-failed-cases.spec.util.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';
import { whenQuiet } from '../utils/watch-wait.spec.util.ts';

/**
 * L16: affected tasks (M3-2) on a `target-like` copy without its `.git`, real VS Code and real turbo. `turbo ls` and a
 * dry run work there, `turbo query affectedTasks` does not, so the root reads Failed: A6 checks the view description, the
 * rows and that a redraw does not spawn the query again.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L16 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);
  const edits = affectedEditsOf(manifest);
  const scene: AffectedScene = { api, env, root, counter, manifest, edits };

  try {
    await step('reveal the view', async () => revealTree(api, root));
    await step('the root is quiet', async () => whenQuiet(api, root));
    await affectedFailedCase(scene);
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
