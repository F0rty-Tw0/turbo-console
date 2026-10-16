import type { DetailsScene } from '../common/details.type.ts';
import { buildPair } from '../utils/build-pair.spec.util.ts';
import { adhocCase } from '../utils/details-adhoc.spec.util.ts';
import { openCase, runCase, titleCase, watchedCase } from '../utils/details-cases.spec.util.ts';
import { prunedCase } from '../utils/details-folder.spec.util.ts';
import { revealLoads } from '../utils/message-tree.spec.util.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { markDone, rootAt, step, turboApi, waitFor } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';
import { whenQuiet } from '../utils/watch-wait.spec.util.ts';

/**
 * L8: Package Details on `two-roots`, two clean `target-like` copies; cases 1 to 5 use root `a`, case 6 removes root
 * `b`. The real page posts `ready` itself; the cases send one more where they need a state posted at a known point.
 * The cases run in order and share state; case 6 changes the workspace folders, so it must stay last. Spawn counts are taken inside the windows of cases 1 and 4 only, after both roots have loaded and gone quiet.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L8 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const roots = [root, rootAt(1)];
  const [task] = buildPair(manifest);
  const counter = countTurboSpawns(turboPath);
  const scene: DetailsScene = { api, root, packageName: task.packageName, taskId: task.fullName, manifest, counter };

  try {
    await step('reveal the view', async () => revealLoads(api, roots));
    await waitFor('tree visible', () => api.treeVisible());
    await step('both roots are quiet', async () => {
      for (const quiet of roots) await whenQuiet(api, quiet);
    });
    await openCase(scene);
    await titleCase(scene);
    await runCase(scene);
    await watchedCase(scene);
    await adhocCase(scene);
    await prunedCase(scene);
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
