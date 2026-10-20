import assert from 'node:assert/strict';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { log, step, waitFor } from './suite-env.spec.util.ts';
import { busiestPackage, packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { ShownManifest } from '../common/launch.type.ts';

const iconIdOf = (item: vscode.TreeItem): string | undefined => {
  const icon = item.iconPath;

  if (icon instanceof vscode.ThemeIcon) return icon.id;

  return undefined;
};

/**
 * Spec 2026-10-20 theme icons: by default a package row takes the file icon theme's folder over its directory, and
 * `turboConsole.icons: builtin` brings back the `package` codicon with no resource uri. Puts the setting back to its
 * default before it returns, whatever failed, so the L2 suite starts clean.
 */
export const iconsCase = async (api: TurboConsoleApi, root: string, manifest: ShownManifest): Promise<void> => {
  const name = busiestPackage(manifest);
  const path = manifest.packages.find((pkg) => pkg.name === name)?.path ?? '';
  const config = vscode.workspace.getConfiguration('turboConsole');
  const node = await packageNodeNamed(api, name);
  const itemNow = (): vscode.TreeItem => api.tree.getTreeItem(node);

  assert.notEqual(path, '', `${name} has no path in the manifest`);

  try {
    await step('icons: a package row takes the theme folder over its directory by default', async () => {
      await config.update('icons', undefined, vscode.ConfigurationTarget.Global);
      await waitFor('theme folder icon', () => iconIdOf(itemNow()) === 'folder');

      const uri = itemNow().resourceUri;

      log(`theme icons: ${name} -> ${uri?.fsPath ?? 'no uri'}`);
      assert.equal(uri?.fsPath, join(root, path));
    });
    await step('icons: builtin brings back the package codicon with no resource uri', async () => {
      await config.update('icons', 'builtin', vscode.ConfigurationTarget.Global);
      await waitFor('package codicon', () => iconIdOf(itemNow()) === 'package' && itemNow().resourceUri === undefined);
    });
  } finally {
    await config.update('icons', undefined, vscode.ConfigurationTarget.Global);
  }
};
