import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { renderAtomGroup } from './render-atom-group.util.ts';
import { ATOM_GROUP_PLAN_STUB } from '../test/stubs/fixture.stub.ts';
import { fixturePath } from '../test/utils/fixture-path.spec.util.ts';

const DEFINITIONS_TURBO_JSON = 'tools/e2e-1-atoms/turbo.json';

describe('FEATURE: atom group rendering', () => {
  describe('GIVEN a group with one cached and one live spec file', () => {
    describe('WHEN rendered', () => {
      const files = renderAtomGroup(ATOM_GROUP_PLAN_STUB);
      const contentOf = (path: string): string => files.find((file) => file.path === path)?.content ?? '';
      const definitions: unknown = JSON.parse(contentOf(DEFINITIONS_TURBO_JSON));
      const taskKeyLines = contentOf(DEFINITIONS_TURBO_JSON).matchAll(/^ {4}"([^"]+)": \{$/gm);
      const taskNames = Array.from(taskKeyLines, (match) => match[1]);

      it('THEN both packages come back with their files', () => {
        expect(files.map((file) => file.path)).toStrictEqual([
          'apps/e2e-1/package.json',
          'apps/e2e-1/turbo.json',
          'apps/e2e-1/README.md',
          'apps/e2e-1/tests/spec-001.spec.ts',
          'apps/e2e-1/tests/spec-002.live.spec.ts',
          'tools/e2e-1-atoms/package.json',
          DEFINITIONS_TURBO_JSON
        ]);
      });

      it('THEN the definitions turbo.json equals the hand-checked Atomizer §4 render byte for byte', () => {
        const expected = readFileSync(fixturePath('atom-group-two-specs', 'turbo.json'), 'utf8');

        expect(contentOf(DEFINITIONS_TURBO_JSON)).toBe(expected);
      });

      it('THEN file tasks precede carriers and e2e-ci--all comes last', () => {
        expect(taskNames).toStrictEqual([
          'e2e-ci--tests/spec-001.spec.ts',
          'e2e-ci--tests/spec-002.live.spec.ts',
          'e2e-ci-src--tests/spec-001.spec.ts',
          'e2e-ci-src--tests/spec-002.live.spec.ts',
          'e2e-ci--all'
        ]);
      });

      it('THEN e2e-ci--all depends on the file tasks only', () => {
        expect(definitions).toHaveProperty(['tasks', 'e2e-ci--all'], {
          dependsOn: ['e2e-ci--tests/spec-001.spec.ts', 'e2e-ci--tests/spec-002.live.spec.ts']
        });
      });

      it('THEN the live file task has cache false and the atomizer:live tag', () => {
        expect(definitions).toHaveProperty(['tasks', 'e2e-ci--tests/spec-002.live.spec.ts', 'cache'], false);
        expect(definitions).toHaveProperty(
          ['tasks', 'e2e-ci--tests/spec-002.live.spec.ts', 'tags'],
          ['atomizer:e2e-ci', 'atomizer:live']
        );
      });

      it('THEN the cached file task and every carrier have no cache key', () => {
        expect(definitions).not.toHaveProperty(['tasks', 'e2e-ci--tests/spec-001.spec.ts', 'cache']);
        expect(definitions).not.toHaveProperty(['tasks', 'e2e-ci-src--tests/spec-001.spec.ts', 'cache']);
        expect(definitions).not.toHaveProperty(['tasks', 'e2e-ci-src--tests/spec-002.live.spec.ts', 'cache']);
      });

      it('THEN the test package.json has node -e 0 scripts for the base tasks and no e2e-ci script, and depends on its app', () => {
        const scripts = { build: 'node -e 0', lint: 'node -e 0', test: 'node -e 0', typecheck: 'node -e 0' };
        const dependencies = { '@fx/pkg-001': 'workspace:*' };
        const manifest = { name: '@fx/e2e-1', private: true, version: '0.0.0', scripts, dependencies };

        expect(contentOf('apps/e2e-1/package.json')).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
      });

      it('THEN the test turbo.json extends the root and the definitions package and adds the e2e-ci umbrella', () => {
        const e2eCi = { dependsOn: ['e2e-ci--all'] };
        const tasks = { 'e2e-ci': e2eCi };
        const turbo = { extends: ['//', '@fx/e2e-1-atoms'], tasks };

        expect(contentOf('apps/e2e-1/turbo.json')).toBe(`${JSON.stringify(turbo, null, 2)}\n`);
      });

      it('THEN the definitions package.json has no scripts', () => {
        const manifest = { name: '@fx/e2e-1-atoms', private: true, version: '0.0.0' };

        expect(contentOf('tools/e2e-1-atoms/package.json')).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
      });

      it('THEN each spec file and the README is one LF-terminated line', () => {
        const textFiles = files.filter((file) => !file.path.endsWith('.json'));

        expect(textFiles.map((file) => file.content.split('\n').length)).toStrictEqual([2, 2, 2]);
      });

      it('THEN a spec file is a Playwright test named after the file', () => {
        expect(contentOf('apps/e2e-1/tests/spec-002.live.spec.ts')).toBe(
          "import { test } from '@playwright/test'; test('spec-002.live.spec.ts', () => {});\n"
        );
      });
    });
  });
});
