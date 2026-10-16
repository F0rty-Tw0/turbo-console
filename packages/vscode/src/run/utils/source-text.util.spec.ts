import type { PackageManagerSource } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { sourceText } from './source-text.util.ts';

const SOURCES: [string, PackageManagerSource, string][] = [
  ['the packageManager field', { kind: 'field' }, '(from packageManager)'],
  ['devEngines', { kind: 'devEngines' }, '(from devEngines)'],
  ['pnpm-lock.yaml', { kind: 'lockfile', file: 'pnpm-lock.yaml' }, '(from pnpm-lock.yaml)'],
  ['bun.lockb', { kind: 'lockfile', file: 'bun.lockb' }, '(from bun.lockb)'],
  ['nothing', { kind: 'default' }, '(default)']
];

describe('FEATURE: package manager source text', () => {
  describe('GIVEN where the package manager came from', () => {
    it.each(SOURCES)('WHEN it came from %s THEN the text is %s', (_label, source, text) => {
      expect(sourceText(source)).toBe(text);
    });
  });
});
