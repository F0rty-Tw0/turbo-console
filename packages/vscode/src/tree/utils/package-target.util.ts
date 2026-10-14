import { join } from 'node:path';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { PackageTarget } from '../common/package-action.type.ts';

const isFields = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null;

/** The package a package action was invoked on, from a package or task row; `null` for any other argument. */
export const packageTargetOf = (value: unknown): PackageTarget | null => {
  if (!isFields(value)) return null;

  const { kind, root, packageName } = value;
  const isPackageRow = kind === 'pkg' || kind === 'task';

  if (!isPackageRow) return null;

  if (typeof root !== 'string' || typeof packageName !== 'string') return null;

  const target: PackageTarget = { root, packageName };

  return target;
};

/** The absolute directory of `target` in the current model of its root; `null` while the root has no model or the package. */
export const packageDirOf = (target: PackageTarget, state: RootState | undefined): string | null => {
  const pkg = state?.model?.packages.find((node) => node.name === target.packageName);

  if (pkg === undefined) return null;

  return join(target.root, pkg.path);
};
