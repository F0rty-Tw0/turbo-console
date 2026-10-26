import type { PackageNode } from '@turbo-console/core';

import { isVisibleScript } from './script-task.util.ts';
import type { RootEntry } from '../../roots/common/coordinator.type.ts';

const hasScriptTask = (pkg: PackageNode): boolean => pkg.tasks.some(isVisibleScript);

const hasScriptPackage = (entry: RootEntry): boolean => {
  const packages = entry.state.model?.packages ?? [];

  return packages.some(hasScriptTask);
};

/** True when any root's loaded model has a package with a visible non-turbo task: one the Scripts toggle can show. */
export const hasScriptsOf = (entries: RootEntry[]): boolean => entries.some(hasScriptPackage);
