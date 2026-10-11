import { describe, expect, it } from 'vitest';

import { renderRootFiles } from './render-root-files.util.ts';
import { renderTurboJson } from './render-turbo-json.util.ts';
import type { FixturePlan, FixtureSpec, PackagePlan } from '../common/fixture.type.ts';
import { ATOM_GROUP_PLAN_STUB, FIXTURE_SPEC_STUB, PACKAGE_PLAN_STUB } from '../test/stubs/fixture.stub.ts';

describe('FEATURE: root file rendering', () => {
  describe('GIVEN a plan with the hub and one regular package that depends on it, and no atom groups', () => {
    const hub: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/hub', path: 'packages/hub', role: 'hub', tags: ['fx:hub'] };
    const regular: PackagePlan = { ...PACKAGE_PLAN_STUB, level: 1, dependencies: ['@fx/hub'] };
    const plan: FixturePlan = { spec: FIXTURE_SPEC_STUB, packages: [hub, regular], atomGroups: [] };
    const files = renderRootFiles(plan);
    const contentOf = (path: string): string | undefined => files.find((file) => file.path === path)?.content;

    it('THEN the root package.json, pnpm-workspace.yaml, .gitignore, turbo.json and pnpm-lock.yaml come back', () => {
      expect(files.map((file) => file.path)).toStrictEqual([
        'package.json',
        'pnpm-workspace.yaml',
        '.gitignore',
        'turbo.json',
        'pnpm-lock.yaml'
      ]);
    });

    it('THEN package.json is private and pins pnpm 12.11.2', () => {
      expect(contentOf('package.json')).toBe('{\n  "name": "fx-root",\n  "private": true,\n  "packageManager": "pnpm@12.11.2"\n}\n');
    });

    it('THEN pnpm-workspace.yaml lists packages/* only', () => {
      expect(contentOf('pnpm-workspace.yaml')).toBe('packages:\n  - packages/*\n');
    });

    it('THEN .gitignore ignores node_modules/ and .turbo/', () => {
      expect(contentOf('.gitignore')).toBe('node_modules/\n.turbo/\n');
    });

    it('THEN turbo.json is the rendered root turbo.json', () => {
      expect(contentOf('turbo.json')).toBe(renderTurboJson(plan).content);
    });

    it('THEN pnpm-lock.yaml has an importer for each package with the hub link', () => {
      expect(contentOf('pnpm-lock.yaml')).toContain(
        "  packages/hub: {}\n\n  packages/pkg-001:\n    dependencies:\n      '@fx/hub':\n"
      );
    });

    it('THEN every file is LF-only and ends with a newline', () => {
      expect(files.every((file) => !file.content.includes('\r') && file.content.endsWith('\n'))).toBe(true);
    });
  });

  describe('GIVEN a plan with one atom group', () => {
    describe('WHEN rendered', () => {
      const atomGroups = { ...FIXTURE_SPEC_STUB.atomGroups, count: 1 };
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, atomGroups };
      const plan: FixturePlan = { spec, packages: [PACKAGE_PLAN_STUB], atomGroups: [ATOM_GROUP_PLAN_STUB] };
      const files = renderRootFiles(plan);
      const contentOf = (path: string): string | undefined => files.find((file) => file.path === path)?.content;

      it('THEN pnpm-workspace.yaml also lists apps/* and tools/*', () => {
        expect(contentOf('pnpm-workspace.yaml')).toBe('packages:\n  - apps/*\n  - packages/*\n  - tools/*\n');
      });

      it('THEN pnpm-lock.yaml links the test package to its app and lists the dep-less definitions package', () => {
        expect(contentOf('pnpm-lock.yaml')).toContain(
          "  apps/e2e-1:\n    dependencies:\n      '@fx/pkg-001':\n        specifier: workspace:*\n        version: link:../../packages/pkg-001\n\n  packages/pkg-001: {}\n\n  tools/e2e-1-atoms: {}\n"
        );
      });
    });
  });
});
