import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { hasOtherPackagesOf, rootSizeNameOf } from './root-prefix.util.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { ROOT_PREFIX } from '../common/root-prefix.const.ts';
import { PACKAGE_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const ROOT: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '' };
const WEB: PackageNode = { ...PACKAGE_NODE_STUB, name: 'web', path: 'apps/web' };

describe('FEATURE: root prefix', () => {
  describe('GIVEN the packages of a root', () => {
    it.each([
      { given: 'no packages', packages: [], expected: false },
      { given: 'only the root', packages: [ROOT], expected: false },
      { given: 'only a non-root package', packages: [WEB], expected: false },
      { given: 'the root and another package', packages: [ROOT, WEB], expected: true }
    ])('WHEN they are $given THEN having other packages is $expected', ({ packages, expected }) => {
      expect(hasOtherPackagesOf(packages)).toBe(expected);
    });
  });

  const labelled: PackageNode = { ...ROOT, label: '@acme/monorepo' };
  const labelledWeb: PackageNode = { ...WEB, label: 'web' };

  describe('GIVEN a package and whether its repo is prefixed', () => {
    it.each([
      { given: 'a labelled root in a prefixed repo', pkg: labelled, rootPrefixed: true, expected: '(root) @acme/monorepo' },
      { given: 'a labelled root in an unprefixed repo', pkg: labelled, rootPrefixed: false, expected: undefined },
      { given: 'a root with no label', pkg: ROOT, rootPrefixed: true, expected: undefined },
      { given: 'a non-root package', pkg: labelledWeb, rootPrefixed: true, expected: undefined }
    ])('WHEN it is $given THEN its size name is $expected', ({ pkg, rootPrefixed, expected }) => {
      expect(rootSizeNameOf(pkg, rootPrefixed)).toBe(expected);
    });
  });

  describe('GIVEN a root label longer than LABEL_MAX', () => {
    it('WHEN its size name is read THEN the text is the prefix plus the whole cleaned label', () => {
      const long: PackageNode = { ...ROOT, label: 'a'.repeat(LABEL_MAX + 10) };
      const text = rootSizeNameOf(long, true);

      expect(text).toBe(`${ROOT_PREFIX}${'a'.repeat(LABEL_MAX - 1)}…`);
    });
  });
});
