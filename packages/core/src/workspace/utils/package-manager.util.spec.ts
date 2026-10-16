import { describe, expect, it } from 'vitest';

import { devEnginesManagerOf, fieldManagerOf, packageManagerOf } from './package-manager.util.ts';
import type { ManifestFields } from '../common/manifest-fields.type.ts';
import type { LockfileName, PackageManager, PackageManagerName, PackageManagerSource } from '../common/workspace-model.type.ts';

const FIELD_CASES: [unknown, PackageManagerName][] = [
  ['pnpm@9.1.0+sha512.x', 'pnpm'],
  ['yarn', 'yarn'],
  ['bun@1', 'bun'],
  ['npm@10.2.0', 'npm']
];

const NON_MANAGERS = ['deno@2', '', 42, '@x/y@1', undefined, null, 'pnpmx', 'pnpmx@1', ' pnpm'];

const LOCKFILE_CASES: [LockfileName[], PackageManagerName, LockfileName][] = [
  [['pnpm-lock.yaml', 'bun.lock', 'bun.lockb', 'yarn.lock', 'package-lock.json'], 'pnpm', 'pnpm-lock.yaml'],
  [['bun.lock', 'bun.lockb', 'yarn.lock', 'package-lock.json'], 'bun', 'bun.lock'],
  [['bun.lockb', 'yarn.lock', 'package-lock.json'], 'bun', 'bun.lockb'],
  [['yarn.lock', 'package-lock.json'], 'yarn', 'yarn.lock'],
  [['package-lock.json'], 'npm', 'package-lock.json']
];

const DEV_ENGINES_CASES: [unknown, PackageManagerName][] = [
  [{ name: 'pnpm' }, 'pnpm'],
  [{ name: 'bun', version: '1.2.0', onFail: 'error' }, 'bun'],
  [[{ name: 'yarn' }, { name: 'npm' }], 'yarn'],
  [[{ name: 'npm' }, { name: 'pnpm' }], 'npm']
];

const NON_DEV_ENGINES = [
  { name: 'pnpm@9' },
  { name: 'deno' },
  [],
  'pnpm',
  { name: 42 },
  {},
  null,
  undefined,
  [{ name: 'deno' }, { name: 'pnpm' }]
];

/** A root `packageManager` field that names no manager, so it must not shadow `devEngines`. */
const UNUSABLE_FIELDS = ['deno@2', 42];

const ALL_LOCKFILES: LockfileName[] = ['pnpm-lock.yaml', 'bun.lock', 'bun.lockb', 'yarn.lock', 'package-lock.json'];

/** The two manifest values `packageManagerOf` reads; `devEnginesManager` is the value of `devEngines.packageManager`. */
const fieldsOf = (packageManager: unknown, devEnginesManager?: unknown): ManifestFields => {
  const fields: ManifestFields = { packageManager, devEnginesManager };

  return fields;
};

const devEnginesOf = (name: PackageManagerName): PackageManager => {
  const source: PackageManagerSource = { kind: 'devEngines' };

  const manager: PackageManager = { name, source };

  return manager;
};

const fieldOf = (name: PackageManagerName): PackageManager => {
  const source: PackageManagerSource = { kind: 'field' };

  const manager: PackageManager = { name, source };

  return manager;
};

const lockfileOf = (name: PackageManagerName, file: LockfileName): PackageManager => {
  const source: PackageManagerSource = { kind: 'lockfile', file };

  const manager: PackageManager = { name, source };

  return manager;
};

const defaultOf = (): PackageManager => {
  const source: PackageManagerSource = { kind: 'default' };

  const manager: PackageManager = { name: 'npm', source };

  return manager;
};

describe('FEATURE: package manager detection', () => {
  describe('GIVEN a root packageManager field', () => {
    it.each(FIELD_CASES)('WHEN it is %j THEN the manager is %s', (value, name) => {
      expect(fieldManagerOf(value)).toBe(name);
    });

    it.each(NON_MANAGERS)('WHEN it is %j THEN it names no manager', (value) => {
      expect(fieldManagerOf(value)).toBeNull();
    });

    it('WHEN every lockfile is present THEN the field still wins', () => {
      const manager = packageManagerOf(fieldsOf('yarn@4.0.0', { name: 'pnpm' }), new Set(ALL_LOCKFILES));

      expect(manager).toStrictEqual(fieldOf('yarn'));
    });
  });

  describe('GIVEN a root devEngines.packageManager', () => {
    it.each(DEV_ENGINES_CASES)('WHEN it is %j THEN the manager is %s', (value, name) => {
      expect(devEnginesManagerOf(value)).toBe(name);
    });

    it.each(NON_DEV_ENGINES)('WHEN it is %j THEN it names no manager', (value) => {
      expect(devEnginesManagerOf(value)).toBeNull();
    });

    it('WHEN every lockfile is present THEN devEngines still wins', () => {
      const manager = packageManagerOf(fieldsOf(undefined, { name: 'bun' }), new Set(ALL_LOCKFILES));

      expect(manager).toStrictEqual(devEnginesOf('bun'));
    });

    it('WHEN the first array entry is a manager THEN it wins over the entries after it', () => {
      const manager = packageManagerOf(fieldsOf(undefined, [{ name: 'yarn' }, { name: 'pnpm' }]), new Set<LockfileName>());

      expect(manager).toStrictEqual(devEnginesOf('yarn'));
    });

    it.each(UNUSABLE_FIELDS)('WHEN packageManager is %j, no manager, THEN devEngines still wins over the lockfile', (value) => {
      const manager = packageManagerOf(fieldsOf(value, { name: 'pnpm' }), new Set<LockfileName>(['yarn.lock']));

      expect(manager).toStrictEqual(devEnginesOf('pnpm'));
    });

    it('WHEN it names no manager THEN the lockfile decides', () => {
      const manager = packageManagerOf(fieldsOf(undefined, { name: 'deno' }), new Set<LockfileName>(['yarn.lock']));

      expect(manager).toStrictEqual(lockfileOf('yarn', 'yarn.lock'));
    });
  });

  describe('GIVEN no usable field', () => {
    it.each(LOCKFILE_CASES)('WHEN %j are present THEN the manager is %s from %s', (files, name, file) => {
      const manager = packageManagerOf(fieldsOf(undefined), new Set(files));

      expect(manager).toStrictEqual(lockfileOf(name, file));
    });

    it('WHEN the field is no manager THEN the lockfile decides', () => {
      const manager = packageManagerOf(fieldsOf('deno@2'), new Set<LockfileName>(['yarn.lock']));

      expect(manager).toStrictEqual(lockfileOf('yarn', 'yarn.lock'));
    });

    it('WHEN no lockfile is present THEN the manager is npm by default', () => {
      const manager = packageManagerOf(fieldsOf(undefined), new Set<LockfileName>());

      expect(manager).toStrictEqual(defaultOf());
    });
  });
});
