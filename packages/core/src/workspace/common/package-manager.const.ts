import type { LockfileName, PackageManager, PackageManagerName, PackageManagerSource } from './workspace-model.type.ts';

/** `packageManager` field: a manager name, then `@version` or the end. */
export const PACKAGE_MANAGER_FIELD = /^(npm|pnpm|yarn|bun)(@|$)/;

export const PACKAGE_MANAGER_NAMES = ['npm', 'pnpm', 'yarn', 'bun'] satisfies PackageManagerName[];

/** The order a root lockfile wins in: the first one present names the manager. */
export const LOCKFILE_DETECTION_ORDER = [
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'yarn.lock',
  'package-lock.json'
] satisfies LockfileName[];

export const LOCKFILE_MANAGERS: Readonly<Record<LockfileName, PackageManagerName>> = {
  'pnpm-lock.yaml': 'pnpm',
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm'
};

export const FIELD_SOURCE: PackageManagerSource = { kind: 'field' };

const DEFAULT_SOURCE: PackageManagerSource = { kind: 'default' };

export const DEFAULT_PACKAGE_MANAGER: PackageManager = { name: 'npm', source: DEFAULT_SOURCE };
