import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { renderLockfile } from './render-lockfile.util.ts';
import type { PackagePlan } from '../common/fixture.type.ts';
import { PACKAGE_PLAN_STUB } from '../test/stubs/fixture.stub.ts';
import { fixturePath } from '../test/utils/fixture-path.spec.util.ts';

describe('FEATURE: pnpm lockfile rendering', () => {
  describe('GIVEN the three-package workspace of the hand-written verify-first lockfile, out of path order', () => {
    const lib: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/lib', path: 'packages/lib' };
    const e2e: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/web-e2e', path: 'packages/web-e2e', dependencies: ['@fx/lib'] };
    const atoms: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/web-e2e-atoms', path: 'packages/web-e2e-atoms' };

    it('WHEN rendered THEN the file is pnpm-lock.yaml at the fixture root', () => {
      const file = renderLockfile([atoms, e2e, lib]);

      expect(file.path).toBe('pnpm-lock.yaml');
    });

    it('WHEN rendered THEN the content equals the hand-written lockfile byte for byte', () => {
      const expected = readFileSync(fixturePath('three-package-lock', 'pnpm-lock.yaml'), 'utf8');

      const file = renderLockfile([atoms, e2e, lib]);

      expect(file.content).toBe(expected);
    });
  });

  describe('GIVEN a package in apps/ that depends on the hub in packages/', () => {
    it('WHEN rendered THEN the link climbs out of apps/', () => {
      const hub: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/hub', path: 'packages/hub' };
      const app: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/e2e-1', path: 'apps/e2e-1', dependencies: ['@fx/hub'] };

      const file = renderLockfile([hub, app]);

      expect(file.content).toContain(
        "  apps/e2e-1:\n    dependencies:\n      '@fx/hub':\n        specifier: workspace:*\n        version: link:../../packages/hub\n"
      );
    });
  });

  describe('GIVEN a dependency on a package missing from the list', () => {
    it('WHEN rendered THEN it throws naming the missing package', () => {
      const app: PackagePlan = { ...PACKAGE_PLAN_STUB, dependencies: ['@fx/missing'] };

      const render = (): unknown => renderLockfile([app]);

      expect(render).toThrow('@fx/missing');
    });
  });
});
