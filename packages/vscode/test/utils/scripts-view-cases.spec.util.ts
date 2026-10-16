import assert from 'node:assert/strict';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { lensCountOf, lensTitlesOf, packageLensTitles } from './scripts-lens.spec.util.ts';
import { listedPackages, scriptKeysOf, scriptsGroupOf } from './scripts-tree.spec.util.ts';
import { log, step } from './suite-env.spec.util.ts';
import { descriptionOf } from './tree-polish-tree.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { ADDED_TASK_IDS, LENS_COMMAND_ID, SCRIPTS_ONLY_PACKAGE, SCRIPTS_PACKAGE } from '../common/scripts.const.ts';

const lensCountOver = async (root: string, name: string): Promise<number> => {
  const titles = await packageLensTitles(root, name);

  assert.equal(titles.length, 1, `lenses over ${name}: ${titles.join(' | ')}`);

  return lensCountOf(titles[0] ?? '');
};

/** Case 1: scripts are hidden by default, so no Scripts group, no scripts-only package, and a lens that counts turbo tasks only; returns that count. */
export const hiddenCase = async (api: TurboConsoleApi, root: string): Promise<number> => {
  let count = 0;

  await step(
    'L10-1: scripts are hidden by default: no Scripts group, no scripts-only package, a lens of turbo tasks only',
    async () => {
      const pkg = await packageNodeNamed(api, SCRIPTS_PACKAGE);
      const children = await api.tree.getChildren(pkg);
      const kinds = children.map((child) => child.kind);
      const packages = await listedPackages(api);

      count = await lensCountOver(root, SCRIPTS_PACKAGE);

      assert.equal(api.tree.isScriptsShown(), false);
      assert.ok(!kinds.includes('scripts'), `${SCRIPTS_PACKAGE} shows a scripts group`);
      assert.ok(!packages.includes(SCRIPTS_ONLY_PACKAGE), `the tree lists ${SCRIPTS_ONLY_PACKAGE}`);
      assert.ok(count > 0, `the lens over ${SCRIPTS_PACKAGE} counts ${count} tasks`);
    }
  );

  return count;
};

/**
 * Case 2: Show Scripts adds a Scripts group of exactly the three added scripts, the scripts-only package, and three more
 * names to the package's lens. The model holds no `//` package (V5), so the root `package.json` has no lens.
 */
export const shownCase = async (api: TurboConsoleApi, root: string, hiddenCount: number): Promise<void> => {
  await step('L10-2: Show Scripts adds the Scripts group, the scripts-only package and three lens names', async () => {
    await vscode.commands.executeCommand('turboConsole.showScripts');

    const group = await scriptsGroupOf(api, SCRIPTS_PACKAGE);
    const keys = await scriptKeysOf(api, SCRIPTS_PACKAGE);
    const onlyKeys = await scriptKeysOf(api, SCRIPTS_ONLY_PACKAGE);
    const count = await lensCountOver(root, SCRIPTS_PACKAGE);
    const rootLenses = await lensTitlesOf(join(root, 'package.json'));

    assert.equal(api.tree.isScriptsShown(), true);
    assert.ok(group !== undefined, `${SCRIPTS_PACKAGE} shows no Scripts group`);
    assert.equal(descriptionOf(api, group), String(ADDED_TASK_IDS.length));
    assert.deepEqual(keys, ADDED_TASK_IDS);
    assert.equal(onlyKeys.length, 2);
    assert.equal(count, hiddenCount + ADDED_TASK_IDS.length);
    assert.deepEqual(rootLenses, []);
    log(`V5: the model holds no // package, so the root package.json has no ${LENS_COMMAND_ID} lens`);
  });
};
