import {
  DEFAULT_PACKAGE_MANAGER,
  FIELD_SOURCE,
  LOCKFILE_DETECTION_ORDER,
  LOCKFILE_MANAGERS,
  PACKAGE_MANAGER_FIELD,
  PACKAGE_MANAGER_NAMES
} from '../common/package-manager.const.ts';
import type { LockfileName, PackageManager, PackageManagerName, PackageManagerSource } from '../common/workspace-model.type.ts';

/** The manager a root `packageManager` field (`pnpm@9.1.0+sha512.x`, `yarn`) names; null for anything else. */
export const fieldManagerOf = (value: unknown): PackageManagerName | null => {
  if (typeof value !== 'string') return null;

  const match = PACKAGE_MANAGER_FIELD.exec(value);
  const found = PACKAGE_MANAGER_NAMES.find((name) => name === match?.[1]);
  const manager = found ?? null;

  return manager;
};

/** The manager a root lockfile names, with that file as its source. */
const lockfileManagerOf = (file: LockfileName): PackageManager => {
  const source: PackageManagerSource = { kind: 'lockfile', file };
  const name = LOCKFILE_MANAGERS[file];
  const manager: PackageManager = { name, source };

  return manager;
};

/** The manager the root `packageManager` field names, with the field as its source. */
const fieldManagerNamed = (name: PackageManagerName): PackageManager => {
  const manager: PackageManager = { name, source: FIELD_SOURCE };

  return manager;
};

/**
 * The repo's package manager: the root `packageManager` field, else the first root lockfile in
 * `LOCKFILE_DETECTION_ORDER` that is `present`, else npm.
 */
export const packageManagerOf = (field: unknown, present: ReadonlySet<LockfileName>): PackageManager => {
  const name = fieldManagerOf(field);

  if (name !== null) return fieldManagerNamed(name);

  const file = LOCKFILE_DETECTION_ORDER.find((lockfile) => present.has(lockfile));

  if (file !== undefined) return lockfileManagerOf(file);

  return DEFAULT_PACKAGE_MANAGER;
};
