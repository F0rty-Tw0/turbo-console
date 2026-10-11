import { describe, expect, it } from 'vitest';

import { renderPackageFiles } from './render-package-files.util.ts';
import type { PackagePlan } from '../common/fixture.type.ts';
import { PACKAGE_PLAN_STUB } from '../test/stubs/fixture.stub.ts';

describe('FEATURE: package file rendering', () => {
  describe('GIVEN a regular package whose lint task is a phantom', () => {
    const pkg: PackagePlan = { ...PACKAGE_PLAN_STUB, phantoms: ['lint'] };

    it('WHEN rendered THEN package.json, README.md and src/index.ts come back under the package path', () => {
      const files = renderPackageFiles(pkg);

      expect(files.map((file) => file.path)).toStrictEqual([
        'packages/pkg-001/package.json',
        'packages/pkg-001/README.md',
        'packages/pkg-001/src/index.ts'
      ]);
    });

    it('WHEN rendered THEN package.json has node -e 0 scripts for the non-phantom tasks only and no dependencies', () => {
      const scripts = { build: 'node -e 0', test: 'node -e 0', typecheck: 'node -e 0' };
      const manifest = { name: '@fx/pkg-001', private: true, version: '0.0.0', scripts };
      const expected = `${JSON.stringify(manifest, null, 2)}\n`;

      const [packageJson] = renderPackageFiles(pkg);

      expect(packageJson?.content).toBe(expected);
    });

    it('WHEN rendered THEN README.md and src/index.ts are one LF-terminated line each', () => {
      const [, readme, index] = renderPackageFiles(pkg);

      expect(readme?.content).toBe('# @fx/pkg-001\n');
      expect(index?.content).toBe("export const name = '@fx/pkg-001';\n");
    });
  });

  describe('GIVEN a regular package that depends on the hub and another package', () => {
    it('WHEN rendered THEN package.json lists both as workspace:* dependencies', () => {
      const pkg: PackagePlan = { ...PACKAGE_PLAN_STUB, dependencies: ['@fx/hub', '@fx/pkg-002'] };

      const [packageJson] = renderPackageFiles(pkg);
      const manifest: unknown = JSON.parse(packageJson?.content ?? '');

      expect(manifest).toHaveProperty('dependencies', { '@fx/hub': 'workspace:*', '@fx/pkg-002': 'workspace:*' });
    });
  });

  describe('GIVEN the hub, tagged fx:hub', () => {
    it('WHEN rendered THEN a turbo.json extends the root and carries the tag', () => {
      const hub: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/hub', path: 'packages/hub', role: 'hub', tags: ['fx:hub'] };

      const files = renderPackageFiles(hub);

      expect(files[3]).toStrictEqual({
        path: 'packages/hub/turbo.json',
        content: '{\n  "extends": [\n    "//"\n  ],\n  "tags": [\n    "fx:hub"\n  ]\n}\n'
      });
    });
  });
});
