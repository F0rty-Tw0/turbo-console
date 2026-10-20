import { describe, expect, it } from 'vitest';

import { resolveTool } from './tool-of.util.ts';
import type { PackageScripts } from '../common/tool.type.ts';

const UNREADABLE: PackageScripts = {
  get bodies(): ReadonlyMap<string, string> {
    throw new Error('bodies read');
  },
  get followTurbo(): boolean {
    throw new Error('followTurbo read');
  }
};

describe('FEATURE: tool detection without a delegation form', () => {
  describe('GIVEN package scripts that throw when read', () => {
    it.each<[string, string | null]>([
      ['vitest', 'vitest'],
      ['rm -rf dist && tsc', 'typescript'],
      ['node x.js', null],
      ['echo done; NODE_ENV=test npx jest', 'jest'],
      ['pnpm exec eslint .', 'eslint']
    ])('WHEN %j is resolved THEN it is %s without reading the scripts', (command, id) => {
      const match = resolveTool(command, UNREADABLE);

      expect(match?.tool.id ?? null).toBe(id);
    });
  });
});
