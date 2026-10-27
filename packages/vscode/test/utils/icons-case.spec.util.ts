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

const ICON_THEME_KEY = 'iconTheme';

/**
 * Spec 2026-10-20 theme icons and D9: with `turboConsole.icons` unset a package row follows the file icon theme. Seti has no
 * folder icons, so it keeps the `package` codicon with no resource uri; Minimal has them, so the row takes the theme folder over
 * its directory. `theme` does the same under Seti. Puts both settings back to their defaults before it returns, whatever
 * failed, so the L2 suite starts clean.
 */
export const iconsCase = async (api: TurboConsoleApi, root: string, manifest: ShownManifest): Promise<void> => {
  const name = busiestPackage(manifest);
  const path = manifest.packages.find((pkg) => pkg.name === name)?.path ?? '';
  const config = vscode.workspace.getConfiguration('turboConsole');
  const workbench = vscode.workspace.getConfiguration('workbench');
  const node = await packageNodeNamed(api, name);
  const itemNow = (): vscode.TreeItem => api.tree.getTreeItem(node);
  const themeFolderNow = (): boolean => iconIdOf(itemNow()) === 'folder';
  const assertThemeFolder = (): void => {
    const uri = itemNow().resourceUri;

    log(`theme icons: ${name} -> ${uri?.fsPath ?? 'no uri'}`);
    assert.equal(uri?.fsPath, join(root, path));
  };

  assert.notEqual(path, '', `${name} has no path in the manifest`);

  try {
    await step('icons: unset with the Seti icon theme, a package row keeps the package codicon with no resource uri', async () => {
      await config.update('icons', undefined, vscode.ConfigurationTarget.Global);
      await workbench.update(ICON_THEME_KEY, 'vs-seti', vscode.ConfigurationTarget.Global);
      await waitFor('package codicon', () => iconIdOf(itemNow()) === 'package' && itemNow().resourceUri === undefined);
    });
    await step('icons: unset with the Minimal icon theme, a package row takes the theme folder over its directory', async () => {
      await workbench.update(ICON_THEME_KEY, 'vs-minimal', vscode.ConfigurationTarget.Global);
      await waitFor('theme folder icon under Minimal', themeFolderNow);
      assertThemeFolder();
    });
    await step('icons: theme gives a package row the theme folder over its directory', async () => {
      await workbench.update(ICON_THEME_KEY, 'vs-seti', vscode.ConfigurationTarget.Global);
      await config.update('icons', 'theme', vscode.ConfigurationTarget.Global);
      await waitFor('theme folder icon', themeFolderNow);
      assertThemeFolder();
    });
  } finally {
    await config.update('icons', undefined, vscode.ConfigurationTarget.Global);
    await workbench.update(ICON_THEME_KEY, undefined, vscode.ConfigurationTarget.Global);
  }
};
