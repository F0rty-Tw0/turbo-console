import type { Disposable } from 'vscode';

import type { SharedAffected } from './affected.type.ts';
import type { IconThemeProbe } from './icon-theme.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';

/**
 * The part of `vscode.ExtensionContext` that `registerTree` uses, so a spec builds it without a cast, with the scope and
 * scripts, prediction and affected toggles and the icon theme's folder probe beside it.
 */
export type TreeContext = {
  readonly subscriptions: Disposable[];
  readonly scope: ScriptsToggleApi;
  readonly scripts: ScriptsToggleApi;
  readonly prediction: ScriptsToggleApi;
  readonly affected: ScriptsToggleApi;
  readonly affectedLoads: Pick<SharedAffected, 'view' | 'status' | 'onDidChange'>;
  readonly iconTheme: IconThemeProbe;
};
