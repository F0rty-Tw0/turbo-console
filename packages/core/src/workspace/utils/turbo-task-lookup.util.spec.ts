import { describe, expect, it } from 'vitest';

import { rootKeyTaskOf } from './turbo-task-lookup.util.ts';

type KeyRow = {
  readonly title: string;
  readonly key: string;
  readonly packageName: string;
  readonly singlePackage: boolean;
  readonly expected: string | null;
};

const KEYS: KeyRow[] = [
  { title: 'a bare key of // in single-package mode', key: 'build', packageName: '//', singlePackage: true, expected: 'build' },
  { title: 'a bare key of // in a monorepo', key: 'build', packageName: '//', singlePackage: false, expected: null },
  { title: 'an own qualified key of //', key: '//#lint', packageName: '//', singlePackage: false, expected: 'lint' },
  {
    title: 'an own qualified key of // in single-package mode',
    key: '//#lint',
    packageName: '//',
    singlePackage: true,
    expected: null
  },
  { title: 'a key of another package, single-package', key: 'web#build', packageName: '//', singlePackage: true, expected: null },
  { title: 'a bare key of a package', key: 'build', packageName: 'web', singlePackage: false, expected: 'build' }
];

describe('FEATURE: root key task', () => {
  describe('GIVEN a root config key and the package it is read for', () => {
    it.each(KEYS)('WHEN it is $title THEN rootKeyTaskOf is $expected', ({ key, packageName, singlePackage, expected }) => {
      expect(rootKeyTaskOf(key, packageName, singlePackage)).toBe(expected);
    });
  });
});
