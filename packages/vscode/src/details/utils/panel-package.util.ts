import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import type { OpenPanel } from '../common/panel.type.ts';

/** Whether `model`, if there is one, holds a package named `packageName`. */
export const hasPackage = (model: WorkspaceModel | null | undefined, packageName: string): boolean => {
  const isNamed = (pkg: PackageNode): boolean => pkg.name === packageName;

  return model?.packages.some(isNamed) ?? false;
};

/** Brings `panel` to the front, if there is one; returns it as it came. */
export const revealed = (panel: OpenPanel | null): OpenPanel | null => {
  panel?.view.reveal();

  return panel;
};
