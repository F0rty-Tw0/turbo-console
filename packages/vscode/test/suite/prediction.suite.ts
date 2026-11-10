import type { PredictionScene } from '../common/prediction.type.ts';
import { burstCase, staggeredBurstCase } from '../utils/prediction-burst-cases.spec.util.ts';
import { editCase, runEndCase } from '../utils/prediction-flip-cases.spec.util.ts';
import { graphPageCase } from '../utils/prediction-graph-cases.spec.util.ts';
import { predictionPackagesOf } from '../utils/prediction-scene.spec.util.ts';
import { batchedCase, oneDryRunCase, toggleOffCase } from '../utils/prediction-spawn-cases.spec.util.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';
import { whenQuiet } from '../utils/watch-wait.spec.util.ts';

/**
 * L14: cache prediction (M3-1) on a `target-like` copy of its own, real VS Code and real turbo. The toggle starts at its
 * default (off) in a fresh user-data dir. The cases run in order and share the window: P1 runs with the toggle off and
 * closes the graph it opens; P2 turns the toggle on; P3 clears and refills the store; P4 and P5 run tasks and read the rows
 * (P5 edits a source file and undoes it); P7 opens the real graph page and has it post its task packages; P6 and P6b start
 * bursts of short runs last.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L14 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);
  const packages = predictionPackagesOf(manifest);
  const scene: PredictionScene = { api, env, root, counter, packages, manifest };

  try {
    await step('reveal the view', async () => revealTree(api, root));
    await step('the root is quiet', async () => whenQuiet(api, root));
    await toggleOffCase(scene);
    await oneDryRunCase(scene);
    await batchedCase(scene);
    await runEndCase(scene);
    await editCase(scene);
    await graphPageCase(scene);
    await burstCase(scene);
    await staggeredBurstCase(scene);
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
