import type { RootEntry } from '../../roots/common/coordinator.type.ts';

/**
 * True when at least one root has a loaded model and every loaded model is a single-package repository. A root with no
 * model yet, or an errored root without one, counts neither way.
 */
export const isSinglePackageWindow = (entries: RootEntry[]): boolean => {
  const models = entries.flatMap((entry) => entry.state.model ?? []);

  return models.length > 0 && models.every((model) => model.singlePackage);
};
