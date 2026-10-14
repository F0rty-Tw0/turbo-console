import { isDeepStrictEqual } from 'node:util';

import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { packageMapOf } from './package-map.util.ts';
import type { ModelDiff } from '../common/model-diff.type.ts';

/** Spec §4.3: structural when `before` is null, the name set differs or a `path` moved; else the names whose node differs. */
export const diffModels = (before: WorkspaceModel | null, after: WorkspaceModel): ModelDiff => {
  if (before === null) {
    const first: ModelDiff = { structural: true, changed: [] };

    return first;
  }

  const previous = packageMapOf(before.packages);
  const next = packageMapOf(after.packages);
  const hasUniqueNames = previous.size === before.packages.length && next.size === after.packages.length;
  const hasSameCount = hasUniqueNames && previous.size === next.size;
  const isNewOrMoved = (pkg: PackageNode): boolean => previous.get(pkg.name)?.path !== pkg.path;
  const isDifferent = (pkg: PackageNode): boolean => {
    const old = previous.get(pkg.name);

    return old !== undefined && !isDeepStrictEqual(old, pkg);
  };
  const structural = !hasSameCount || after.packages.some(isNewOrMoved);
  const changed = after.packages.filter(isDifferent).map((pkg) => pkg.name);
  const diff: ModelDiff = { structural, changed: changed.sort() };

  return diff;
};
