import * as vscode from 'vscode';

import type { Output } from '../../shared/common/output.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { UNKNOWN_FACTS } from '../common/icon-theme.const.ts';
import type { IconThemeFacts, IconThemeProbe } from '../common/icon-theme.type.ts';
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
 * the cached answer first. Only `auto` asks `folders` about the theme. A resolve that a newer one overtook is dropped,
 * and a rejected `facts()` is logged and draws as an unknown theme, so no listener throws.
 */
export const watchIcons = (
  tree: Pick<PackagesTreeApi, 'setIcons'>,
  subscriptions: vscode.Disposable[],
  output: Output,
  folders: IconThemeProbe
): void => {
  let latest = 0;
  const logAsUnknown = (error: unknown): IconThemeFacts => {
    output.error(logTextOf(error));

    return UNKNOWN_FACTS;
  };
  const themeFoldersFor = async (setting: IconsSetting): Promise<boolean | null> => {
    if (setting !== 'auto') return null;

    const facts = await folders.facts().catch(logAsUnknown);

    return facts.folders;
  };
  const resolve = async (): Promise<void> => {
    latest += 1;

    const mine = latest;
    const setting = currentIconsSetting();
    const found = await themeFoldersFor(setting);

    if (mine !== latest) return;

    tree.setIcons(iconModeOf(setting, found));
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
