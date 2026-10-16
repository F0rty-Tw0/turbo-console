import type { ManifestFields } from '../common/manifest-fields.type.ts';
import {
  DEFAULT_PACKAGE_MANAGER,
  DEV_ENGINES_SOURCE,
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

/** The `name` of a `devEngines.packageManager` entry; `undefined` for an entry that is no object. */
const entryNameOf = (entry: unknown): unknown => {
  if (typeof entry !== 'object' || entry === null) return undefined;

  return Reflect.get(entry, 'name');
};

/**
 * The manager a root `devEngines.packageManager` names: an object `{ name }`, or an array of them of which only the
 * first, the preferred one, counts. `name` must be exactly a manager name, with no `@version`; null for anything else.
 */
export const devEnginesManagerOf = (value: unknown): PackageManagerName | null => {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  const name = entryNameOf(first);
  const found = PACKAGE_MANAGER_NAMES.find((manager) => manager === name);
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

/** `name` as the manager the root `packageManager` field gave. */
const fieldManagerNamed = (name: PackageManagerName): PackageManager => {
  const manager: PackageManager = { name, source: FIELD_SOURCE };

  return manager;
};

/** `name` as the manager the root `devEngines.packageManager` gave. */
const devEnginesManagerNamed = (name: PackageManagerName): PackageManager => {
  const manager: PackageManager = { name, source: DEV_ENGINES_SOURCE };

  return manager;
};

/**
 * The repo's package manager: the root `packageManager` field, else the root `devEngines.packageManager`, else the
 * first root lockfile in `LOCKFILE_DETECTION_ORDER` that is `present`, else npm.
 */
export const packageManagerOf = (fields: ManifestFields, present: ReadonlySet<LockfileName>): PackageManager => {
  const name = fieldManagerOf(fields.packageManager);

  if (name !== null) return fieldManagerNamed(name);

  const devName = devEnginesManagerOf(fields.devEnginesManager);

  if (devName !== null) return devEnginesManagerNamed(devName);

  const file = LOCKFILE_DETECTION_ORDER.find((lockfile) => present.has(lockfile));

  if (file !== undefined) return lockfileManagerOf(file);

  return DEFAULT_PACKAGE_MANAGER;
};
