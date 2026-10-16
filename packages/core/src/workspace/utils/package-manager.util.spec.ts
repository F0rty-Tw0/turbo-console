import { describe, expect, it } from 'vitest';

import { fieldManagerOf, packageManagerOf } from './package-manager.util.ts';
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

const ALL_LOCKFILES: LockfileName[] = ['pnpm-lock.yaml', 'bun.lock', 'bun.lockb', 'yarn.lock', 'package-lock.json'];

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
      const manager = packageManagerOf('yarn@4.0.0', new Set(ALL_LOCKFILES));

      expect(manager).toStrictEqual(fieldOf('yarn'));
    });
  });

  describe('GIVEN no usable field', () => {
    it.each(LOCKFILE_CASES)('WHEN %j are present THEN the manager is %s from %s', (files, name, file) => {
      const manager = packageManagerOf(undefined, new Set(files));

      expect(manager).toStrictEqual(lockfileOf(name, file));
    });

    it('WHEN the field is no manager THEN the lockfile decides', () => {
      const manager = packageManagerOf('deno@2', new Set<LockfileName>(['yarn.lock']));

      expect(manager).toStrictEqual(lockfileOf('yarn', 'yarn.lock'));
    });

    it('WHEN no lockfile is present THEN the manager is npm by default', () => {
      const manager = packageManagerOf(undefined, new Set<LockfileName>());

      expect(manager).toStrictEqual(defaultOf());
    });
  });
});
