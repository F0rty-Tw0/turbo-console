import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { loadsOf, log, step } from './suite-env.spec.util.ts';
import { walkTree } from './tree-walk.spec.util.ts';
import { whenLoadedAfter, whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

const ADDED_NAME = '@fx/zz-watch';

const ADDED_SCRIPTS = { build: 'node -e 0' };

/** A package the fixture's `packages/*` workspace glob picks up; real turbo 2.11.7 lists it with no warning. */
const ADDED_MANIFEST = { name: ADDED_NAME, private: true, version: '0.0.0', scripts: ADDED_SCRIPTS };

/** Waits out the load a change under `root` starts, and returns how many loads ran and whether the tree shows the package. */
const loadAfter = async (api: TurboConsoleApi, root: string, change: () => Promise<void>): Promise<[number, boolean]> => {
  const records = loadsOf(api, root);
  const before = records.length;

  await change();

  const loads = await whenLoadedAfter(api, root, before);
  const walked = await walkTree(api);
  const isShown = walked.packages.includes(ADDED_NAME);

  return [loads, isShown];
};

/**
 * Spec §4.3 watchers on a whole package: a created `package.json` (watcher 1) adds the package with one load, and
 * deleting its folder (watcher 2: VS Code reports one event for the folder) removes it with one load; a finished
 * package folder renamed into place (watcher 2 again: only the folder's create is reported, never its files) adds it
 * with one load. Removes the folder and the staging dir again before it returns, whatever failed.
 */
export const packageLifecycleCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  const dir = join(root, 'packages', 'zz-watch');
  const manifestText = JSON.stringify(ADDED_MANIFEST, null, 2);
  const create = async (): Promise<void> => {
    await mkdir(dir);
    await writeFile(join(dir, 'package.json'), `${manifestText}\n`);
  };
  const remove = async (): Promise<void> => rm(dir, { recursive: true });
  let stage = '';
  const moveIn = async (): Promise<void> => {
    stage = await mkdtemp(join(dirname(root), 'tc-it-stage-'));

    await writeFile(join(stage, 'package.json'), `${manifestText}\n`);
    await rename(stage, dir);
  };

  try {
    await step('watch: a new package.json adds its package with one load', async () => {
      const [loads, isShown] = await loadAfter(api, root, create);

      log(`package created: ${loads} loads, shown ${isShown}`);
      assert.equal(loads, 1);
      assert.ok(isShown, `${ADDED_NAME} is not in the tree`);
    });
    await step('watch: deleting a package folder removes it with one load', async () => {
      const [loads, isShown] = await loadAfter(api, root, remove);

      log(`package folder deleted: ${loads} loads, shown ${isShown}`);
      assert.equal(loads, 1);
      assert.ok(!isShown, `${ADDED_NAME} is still in the tree`);
    });
    await step('watch: a package folder moved in whole adds its package with one load', async () => {
      const [loads, isShown] = await loadAfter(api, root, moveIn);

      log(`package folder moved in: ${loads} loads, shown ${isShown}`);
      assert.equal(loads, 1);
      assert.ok(isShown, `${ADDED_NAME} is not in the tree`);
    });
    await step('watch: deleting a moved-in package folder removes it with one load', async () => {
      const [loads, isShown] = await loadAfter(api, root, remove);

      log(`moved-in package folder deleted: ${loads} loads, shown ${isShown}`);
      assert.equal(loads, 1);
      assert.ok(!isShown, `${ADDED_NAME} is still in the tree`);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });

    if (stage !== '') await rm(stage, { recursive: true, force: true });
    await whenQuiet(api, root);
  }
};
