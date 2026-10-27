import * as vscode from 'vscode';

import type { Output } from '../../shared/common/output.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { IconThemeProbe } from '../common/icon-theme.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import type { IconsSetting } from '../common/tree-row.type.ts';
import { iconModeOf, iconsSettingOf } from '../utils/icons-mode.util.ts';

/** The `turboConsole.icons` setting now. */
export const currentIconsSetting = (): IconsSetting => {
  const settings = vscode.workspace.getConfiguration('turboConsole');
  const value = settings.get<unknown>('icons');

  return iconsSettingOf(value);
};

/**
 * Keeps the tree's icons mode in step with `turboConsole.icons` and the file icon theme (spec D9, decision Dc3). It
 * resolves once now and again when the setting or `workbench.iconTheme` changes; an extension install or removal drops
 * the cached answer first. A resolve that a newer one overtook is dropped, and a rejected `has()` is logged and draws
 * as an unknown theme, so no listener throws.
 */
export const watchIcons = (
  tree: Pick<PackagesTreeApi, 'setIcons'>,
  subscriptions: vscode.Disposable[],
  output: Output,
  folders: IconThemeProbe
): void => {
  let latest = 0;
  const logAsUnknown = (error: unknown): null => {
    output.error(logTextOf(error));

    return null;
  };
  const resolve = async (): Promise<void> => {
    latest += 1;

    const mine = latest;
    const found = await folders.has().catch(logAsUnknown);

    if (mine !== latest) return;

    tree.setIcons(iconModeOf(currentIconsSetting(), found));
  };
  const onSettings = (event: vscode.ConfigurationChangeEvent): void => {
    const isThemeChanged = event.affectsConfiguration('workbench.iconTheme');
    const isSettingChanged = event.affectsConfiguration('turboConsole.icons');
    const isChanged = isThemeChanged || isSettingChanged;

    if (isChanged) void resolve();
  };
  const onExtensions = (): void => {
    folders.clear();
    void resolve();
  };
  const settings = vscode.workspace.onDidChangeConfiguration(onSettings);
  const extensions = vscode.extensions.onDidChange(onExtensions);

  subscriptions.push(settings, extensions);
  void resolve();
};
