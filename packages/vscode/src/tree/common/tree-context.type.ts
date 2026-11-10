import type { Disposable } from 'vscode';

import type { IconThemeProbe } from './icon-theme.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';

/**
 * The part of `vscode.ExtensionContext` that `registerTree` uses, so a spec builds it without a cast, with the scope and
 * scripts and prediction toggles and the icon theme's folder probe beside it.
 */
export type TreeContext = {
  readonly subscriptions: Disposable[];
  readonly scope: ScriptsToggleApi;
  readonly scripts: ScriptsToggleApi;
  readonly prediction: ScriptsToggleApi;
  readonly iconTheme: IconThemeProbe;
};
