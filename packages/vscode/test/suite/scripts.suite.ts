import { detailsCase } from '../utils/scripts-details-case.spec.util.ts';
import { prepareScriptsFixture } from '../utils/scripts-fixture.spec.util.ts';
import { ctrlCCase, disposeCase, hideWhileRunningCase, stopCase } from '../utils/scripts-live-cases.spec.util.ts';
import { numberNameCase } from '../utils/scripts-number-case.spec.util.ts';
import { failedCase, passedCase } from '../utils/scripts-run-cases.spec.util.ts';
import { hiddenCase, shownCase } from '../utils/scripts-view-cases.spec.util.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/**
 * L10: spec 1c-b §6.3 on a `target-like` copy of its own. Every fixture edit and its backdating come before the view is
 * revealed, so no case sees a load a late write of a keyed file would cost. The cases run in order and share the window:
 * scripts are shown from case 2 on, case 6 ends with them hidden, cases 7 and 8 each show and hide them, and every run ends
 * before the next case.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L10 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);

  try {
    await step('edit the fixture before the view is revealed', async () => prepareScriptsFixture(api, root));
    await step('reveal the view', async () => revealTree(api, root));

    const hiddenCount = await hiddenCase(api, root);

    await shownCase(api, root, hiddenCount);
    await passedCase(api, root, counter);
    await failedCase(api);
    await stopCase(api);
    await disposeCase(api);
    await ctrlCCase(api);
    await hideWhileRunningCase(api);
    await detailsCase(api, root);
    await numberNameCase(api, root);
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
