import { affectedEditsOf } from './affected-edits.spec.util.ts';
import { countTurboSpawns } from './spawn-counter.spec.util.ts';
import { revealTree, rootAt, step, turboApi } from './suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from './suite-input.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { AffectedScene } from '../common/affected.type.ts';
import type { LaunchName } from '../common/launch.type.ts';

/**
 * The scene of an affected launch with the view revealed and the first root quiet; the caller disposes `scene.counter` (a failed start disposes it).
 * `launch` names the launch in the error when the harness gave no dev turbo path.
 */
export const startAffectedScene = async (launch: LaunchName): Promise<AffectedScene> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error(`${launch} needs the dev turbo path`);

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);
  const edits = affectedEditsOf(manifest);
  const scene: AffectedScene = { api, env, root, counter, manifest, edits };

  try {
    await step('reveal the view', async () => revealTree(api, root));
    await step('the root is quiet', async () => whenQuiet(api, root));
  } catch (error) {
    counter.dispose();

    throw error;
  }

  return scene;
};
