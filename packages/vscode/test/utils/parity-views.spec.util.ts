import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { step } from './suite-env.spec.util.ts';
import { manifestTree } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { FixedItem } from '../../src/tree/common/fixed-view.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest } from '../common/launch.type.ts';
import type { ParityScene } from '../common/parity.type.ts';

const COMMAND_IDS = ['runEverywhere', 'runAffected', 'refresh'];

const HELP_IDS = ['readme', 'bug', 'docs'];

const TOP_FOLDERS = ['apps', 'packages'];

const idOf = (item: FixedItem): string => item.id;

const keyOf = (node: TreeNode): string => node.key;

const isDir = (node: TreeNode): boolean => node.kind === 'dir';

const isPackage = (node: TreeNode): boolean => node.kind === 'pkg';

/** The names of every package below `dir`, however deep: only the set is compared, nesting and compression are unit-tested. */
const packagesUnder = async (api: TurboConsoleApi, dir: TreeNode): Promise<string[]> => {
  const children = await api.tree.getChildren(dir);
  const found = children.filter(isPackage).map(keyOf);

  for (const nested of children.filter(isDir)) {
    const names = await packagesUnder(api, nested);

    found.push(...names);
  }

  return found;
};

/** The visible packages of the manifest whose path lies under `folder`. */
const shownUnder = (manifest: ShownManifest, folder: string): string[] => {
  const shown = new Set(manifestTree(manifest).packages);
  const isUnder = (name: string, path: string): boolean => shown.has(name) && path.startsWith(`${folder}/`);
  const under = manifest.packages.filter((pkg) => isUnder(pkg.name, pkg.path));

  return under.map((pkg) => pkg.name);
};

/** Spec §5.3 case 8: both fixed views list their rows, and every row's command is one the extension registered. */
export const fixedViewsCase = async (scene: ParityScene): Promise<void> => {
  const { api } = scene;

  await step('8: the Common Commands and Help views list their fixed rows', async () => {
    const commands = api.commands.getChildren();
    const help = api.help.getChildren();
    const registered = await vscode.commands.getCommands(true);

    assert.deepEqual(commands.map(idOf), COMMAND_IDS);
    assert.deepEqual(help.map(idOf), HELP_IDS);

    for (const item of [...commands, ...help]) {
      assert.ok(registered.includes(item.command.command), `${item.id} runs ${item.command.command}, which is not registered`);
    }
  });
};

/** Spec §5.3 case 8: the default tree mode shows the folders `apps` and `packages`, holding the manifest's visible packages. */
export const foldersCase = async (scene: ParityScene): Promise<void> => {
  const { api, manifest } = scene;

  await step('8: the default tree mode shows the visible packages under apps and packages', async () => {
    const top = await api.tree.getChildren();
    const folders = top.filter(isDir);

    assert.deepEqual(folders.map(keyOf).toSorted(), TOP_FOLDERS);

    for (const folder of folders) {
      const found = await packagesUnder(api, folder);
      const expected = shownUnder(manifest, folder.key);

      assert.deepEqual(found.toSorted(), expected.toSorted(), `the packages under ${folder.key}`);
    }
  });
};
