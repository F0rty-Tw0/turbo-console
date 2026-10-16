import type { PackageManager, PackageManagerSource } from '../../common/workspace-model.type.ts';

const FIELD: PackageManagerSource = { kind: 'field' };

const DEFAULT: PackageManagerSource = { kind: 'default' };

const PNPM_LOCKFILE: PackageManagerSource = { kind: 'lockfile', file: 'pnpm-lock.yaml' };

const YARN_LOCKFILE: PackageManagerSource = { kind: 'lockfile', file: 'yarn.lock' };

const BUN_LOCKFILE: PackageManagerSource = { kind: 'lockfile', file: 'bun.lockb' };

export const PNPM_BY_FIELD_STUB: PackageManager = { name: 'pnpm', source: FIELD };

export const YARN_BY_FIELD_STUB: PackageManager = { name: 'yarn', source: FIELD };

export const PNPM_BY_LOCKFILE_STUB: PackageManager = { name: 'pnpm', source: PNPM_LOCKFILE };

export const YARN_BY_LOCKFILE_STUB: PackageManager = { name: 'yarn', source: YARN_LOCKFILE };

export const BUN_BY_LOCKFILE_STUB: PackageManager = { name: 'bun', source: BUN_LOCKFILE };

export const NPM_BY_DEFAULT_STUB: PackageManager = { name: 'npm', source: DEFAULT };
