import assert from 'node:assert/strict';

import type { AffectedScene } from '../common/affected.type.ts';
import { CI_ENV_KEYS } from '../common/launch.const.ts';
import { affectedOffCase, affectedOnceCase, affectedRefreshCase } from '../utils/affected-cases.spec.util.ts';
import { affectedEditsOf } from '../utils/affected-edits.spec.util.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';
import { whenQuiet } from '../utils/watch-wait.spec.util.ts';

/** The CI variables are gone from this host, so turbo's default base is the local one on a GitHub runner too. */
const assertNoCiEnv = (): void => {
  for (const key of CI_ENV_KEYS) assert.equal(process.env[key], undefined, `${key} is set in the extension host`);
};

/**
 * L15: affected tasks (M3-2) on a `target-like` copy on branch `feat` with a README commit and an uncommitted leaf
 * source edit, real VS Code, real turbo and real git. The toggle starts at its default (off) in a fresh user-data dir.
 * The cases run in order and share the window: A1 runs with the toggle off and closes the graph it opens; A2 turns the
 * toggle on; A5 adds a third edit and refreshes.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L15 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);
  const edits = affectedEditsOf(manifest);
  const scene: AffectedScene = { api, env, root, counter, manifest, edits };

  try {
    await step('reveal the view', async () => revealTree(api, root));
    await step('the root is quiet', async () => whenQuiet(api, root));
    await step('the host env carries no CI variable', assertNoCiEnv);
    await affectedOffCase(scene);
    await affectedOnceCase(scene);
    await affectedRefreshCase(scene);
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
