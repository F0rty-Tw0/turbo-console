import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { importMatchOf } from './import-match.util.ts';
import type { ImportEdge } from '../common/import-match.type.ts';

const ROOT = resolve('/ws');

const A = join(ROOT, 'packages', 'a');

const B = join(ROOT, 'packages', 'b');

const FROM = join(A, 'src');

const EDGE: ImportEdge = { names: ['@company/ui'], targetDir: B, sourceDir: A };

const edgeOf = (patch: Partial<ImportEdge>): ImportEdge => {
  const edge: ImportEdge = { ...EDGE, ...patch };

  return edge;
};

describe('FEATURE: import specifier to dependency edge', () => {
  describe('GIVEN B named @company/ui', () => {
    it.each([
      ['@company/ui', 'name'],
      ['@company/ui/button', 'name'],
      ['@company/ui/icon.svg?raw', 'name'],
      ['@company/ui-kit', null],
      ['@company/uix/a', null],
      ['@Company/ui', null],
      ['@company', null],
      ['@company/ui?raw', null]
    ])('WHEN %j is imported from A/src THEN via is %s', (specifier, expected) => {
      const via = importMatchOf(specifier, FROM, EDGE);

      expect(via).toBe(expected);
    });
  });

  describe("GIVEN A's package.json aliases B as ui-alias", () => {
    it.each([
      ['ui-alias', 'name'],
      ['ui-alias/x', 'name'],
      ['ui-aliased', null]
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ names: ['@company/ui', 'ui-alias'] });

      const via = importMatchOf(specifier, FROM, edge);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN relative specifiers from A/src', () => {
    it.each([
      ['../../b/src/x', 'relative'],
      ['../../b', 'relative'],
      ['./x', null],
      ['../index', null],
      ['.', null],
      ['..', null],
      ['../../c/x', null],
      ['../../bx/x', null],
      ['../../../outside', null],
      [join(B, 'x'), null],
      ['node:fs', null]
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const via = importMatchOf(specifier, FROM, EDGE);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN B is the root package', () => {
    it.each([
      ['./x', null],
      ['../../x', null],
      ['root-pkg/x', 'name']
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ names: ['root-pkg'], targetDir: null });

      const via = importMatchOf(specifier, FROM, edge);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN A is nested in B', () => {
    it.each([
      ['./x', null],
      ['..', null],
      ['../../src/x', 'relative'],
      ['../..', 'relative']
    ])('WHEN %j is imported from a file under A/src THEN via is %s', (specifier, expected) => {
      const sourceDir = join(B, 'plugin');

      const via = importMatchOf(specifier, join(sourceDir, 'src'), edgeOf({ sourceDir }));

      expect(via).toBe(expected);
    });

    it.each([
      ['.', null],
      ['..', 'relative']
    ])('WHEN %j is imported from a file at the top of A THEN via is %s', (specifier, expected) => {
      const sourceDir = join(B, 'plugin');

      const via = importMatchOf(specifier, sourceDir, edgeOf({ sourceDir }));

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN B is nested in A', () => {
    it.each([
      ['../sub/x', 'relative'],
      ['./x', null]
    ])('WHEN %j is imported THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ targetDir: join(A, 'sub') });

      const via = importMatchOf(specifier, FROM, edge);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN A is the root package', () => {
    it.each([
      ['./packages/b/x', 'relative'],
      ['./scripts/x', null]
    ])('WHEN %j is imported from the root THEN via is %s', (specifier, expected) => {
      const edge = edgeOf({ sourceDir: ROOT });

      const via = importMatchOf(specifier, ROOT, edge);

      expect(via).toBe(expected);
    });
  });

  describe('GIVEN a specifier that is a name and looks relative', () => {
    it('WHEN ./@company/ui is imported THEN via is null', () => {
      const via = importMatchOf('./@company/ui', FROM, EDGE);

      expect(via).toBeNull();
    });
  });
});
