import { vi } from 'vitest';

import type { FolderActions } from '../../common/folder-actions.type.ts';
import type { PackageActions, PackageActionsDeps, PackageInspectionActions } from '../../common/package-actions.type.ts';

export const folderActionsMock = (): FolderActions => {
  const actions: FolderActions = { toggle: vi.fn(), focusFolder: vi.fn(), clearFocus: vi.fn(), showFolder: vi.fn() };

  return actions;
};

export const packageActionsMock = (): PackageActions => {
  const actions: PackageActions = {
    openDetails: vi.fn(),
    focus: vi.fn(),
    clearFocus: vi.fn(),
    startTrace: vi.fn(),
    setShown: vi.fn()
  };

  return actions;
};

/** The inspection's list hooks with `focused` as the focused package. */
export const packageActionsDepsMock = (focused: string | null): PackageActionsDeps => {
  const deps: PackageActionsDeps = { focus: (): string | null => focused, onFocusOn: vi.fn(), onExclude: vi.fn(), onShow: vi.fn() };

  return deps;
};

export const packageInspectionActionsMock = (): PackageInspectionActions => {
  const actions: PackageInspectionActions = { openDetailsOf: vi.fn(), input: vi.fn() };

  return actions;
};
