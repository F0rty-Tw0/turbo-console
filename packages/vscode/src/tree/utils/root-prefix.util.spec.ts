import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { hasOtherPackagesOf } from './root-prefix.util.ts';
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
