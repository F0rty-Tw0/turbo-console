import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { hasOtherPackagesOf, rootSizeNameOf } from './root-prefix.util.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { PACKAGE_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const ROOT: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '' };
const WEB: PackageNode = { ...PACKAGE_NODE_STUB, name: 'web', path: 'apps/web' };

describe('FEATURE: hasOtherPackagesOf', () => {
  it.each([
    { given: 'no packages', packages: [], expected: false },
    { given: 'only the root', packages: [ROOT], expected: false },
    { given: 'only a non-root package', packages: [WEB], expected: false },
    { given: 'the root and another package', packages: [ROOT, WEB], expected: true }
  ])('GIVEN $given THEN it is $expected', ({ packages, expected }) => {
    expect(hasOtherPackagesOf(packages)).toBe(expected);
  });
});

describe('FEATURE: rootSizeNameOf', () => {
  const labelled: PackageNode = { ...ROOT, label: '@acme/monorepo' };
  const labelledWeb: PackageNode = { ...WEB, label: 'web' };

  it.each([
    { given: 'a labelled root in a prefixed repo', pkg: labelled, rootPrefixed: true, expected: '(root) @acme/monorepo' },
    { given: 'a labelled root in an unprefixed repo', pkg: labelled, rootPrefixed: false, expected: undefined },
    { given: 'a root with no label', pkg: ROOT, rootPrefixed: true, expected: undefined },
    { given: 'a non-root package', pkg: labelledWeb, rootPrefixed: true, expected: undefined }
  ])('GIVEN $given THEN it is $expected', ({ pkg, rootPrefixed, expected }) => {
    expect(rootSizeNameOf(pkg, rootPrefixed)).toBe(expected);
  });

  it('GIVEN a label longer than LABEL_MAX THEN the text keeps the prefix and fits LABEL_MAX', () => {
    const long: PackageNode = { ...ROOT, label: 'a'.repeat(LABEL_MAX + 10) };
    const text = rootSizeNameOf(long, true);

    expect(text?.startsWith('(root) a')).toBe(true);
    expect(text).toHaveLength(LABEL_MAX);
  });
});
