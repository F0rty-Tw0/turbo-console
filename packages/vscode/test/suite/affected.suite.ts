import { affectedAtomCase } from '../utils/affected-atom-case.spec.util.ts';
import { affectedOffCase, affectedOnceCase, affectedRefreshCase } from '../utils/affected-cases.spec.util.ts';
import { affectedTaskListCase, affectedUpstreamCase } from '../utils/affected-list-cases.spec.util.ts';
import { startAffectedScene } from '../utils/affected-scene-start.spec.util.ts';
import { assertNoCiEnv } from '../utils/ci-env.spec.util.ts';
import { markDone, step } from '../utils/suite-env.spec.util.ts';

/**
 * L15: affected tasks (M3-2) on a `target-like` copy on branch `feat` with a README commit and an uncommitted leaf
 * source edit, real VS Code, real turbo and real git. The toggle starts at its default (off) in a fresh user-data dir.
 * The cases run in order and share the window: A1 runs with the toggle off and closes the graph it opens; A2 turns the
 * toggle on; A3 and A7b read the two-edit list; A5 adds a third edit and refreshes; A4 reads the atom test package of it.
 */
export const run = async (): Promise<void> => {
  const scene = await startAffectedScene('L15');

  try {
    await step('the host env carries no CI variable', assertNoCiEnv);
    await affectedOffCase(scene);
    await affectedOnceCase(scene);
    await affectedTaskListCase(scene);
    await affectedUpstreamCase(scene);
    await affectedRefreshCase(scene);
    await affectedAtomCase(scene);
    await markDone(scene.env);
  } finally {
    scene.counter.dispose();
  }
};
