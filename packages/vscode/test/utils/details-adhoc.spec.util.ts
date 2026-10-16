import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { TaskCard } from '@turbo-console/webview-ui';

import { lastPackageState, packageStates } from './details-posted.spec.util.ts';
import { packageDirOf, setScript, writeEdited } from './package-edit.spec.util.ts';
import { loadsOf, step, waitFor } from './suite-env.spec.util.ts';
import { whenLoadedAfter } from './watch-wait.spec.util.ts';
import type { DetailsScene } from '../common/details.type.ts';

/** A package.json script no turbo.json names: `turbo run` of it exits 1, so the dry run must leave it out. */
const ADHOC = 'zz-adhoc';

const isTurboCardUndefined = (card: TaskCard): boolean => card.isTurboTask && card.command !== null && card.definition === null;

/**
 * A script added to the package's `package.json` shows as a card that says it is not a turbo task, and the dry run of
 * the other tasks still succeeds. The edit stays: the fixture copy is the launch's own.
 */
export const adhocCase = async (scene: DetailsScene): Promise<void> => {
  const { api, root, packageName } = scene;
  const adhocId = `${packageName}#${ADHOC}`;

  await step('L8-5: a script no turbo.json names leaves the dry run ready and reads not a turbo task', async () => {
    const dir = await packageDirOf(root, packageName);
    const file = join(dir, 'package.json');
    const original = await readFile(file, 'utf8');
    const before = loadsOf(api, root).length;

    await writeEdited(file, original, (manifest) => {
      setScript(manifest, ADHOC, 'node -e 0');
    });
    await whenLoadedAfter(api, root, before);
    await api.details.whenIdle(root, packageName);

    const hasAdhocCard = (): boolean => {
      const states = packageStates(api, root, packageName);
      const cards = states.at(-1)?.tasks ?? [];

      return cards.some((card) => card.taskId === adhocId);
    };

    await waitFor('state with the adhoc card', hasAdhocCard);

    const state = lastPackageState(api, root, packageName);
    const adhoc = state.tasks.find((card) => card.taskId === adhocId);
    const undefinedCards = state.tasks.filter(isTurboCardUndefined);
    const undefinedIds = undefinedCards.map((card) => card.taskId);

    assert.equal(state.dryRun, 'ready');
    assert.equal(adhoc?.isTurboTask, false);
    assert.deepEqual(undefinedIds, []);
  });
};
