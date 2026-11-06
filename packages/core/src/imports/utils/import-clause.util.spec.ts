import { describe, expect, it } from 'vitest';

import { importClauseOf } from './import-clause.util.ts';
import { sourceTokensOf } from './source-tokens.util.ts';
import type { ImportClause } from '../common/import-clause.type.ts';

const clauseOf = (text: string): ImportClause | null => importClauseOf(sourceTokensOf(text), 1);

const nextValueOf = (text: string): string | undefined => {
  const tokens = sourceTokensOf(text);
  const clause = importClauseOf(tokens, 1);
  const next = clause ? clause.next : -1;

  return tokens[next]?.value;
};

describe('FEATURE: reading the clause of an import or export', () => {
  describe('GIVEN an import statement', () => {
    it.each([
      ["import x from 'S'", { hasBinding: true, items: 0, typeItems: 0 }],
      ["import {a, b} from 'S'", { hasBinding: false, items: 2, typeItems: 0 }],
      ["import {type A, type B} from 'S'", { hasBinding: false, items: 2, typeItems: 2 }],
      ["import {type A, b} from 'S'", { hasBinding: false, items: 2, typeItems: 1 }],
      ["import x, {type A} from 'S'", { hasBinding: true, items: 1, typeItems: 1 }],
      ["import * as n from 'S'", { hasBinding: true, items: 0, typeItems: 0 }],
      ["import x, * as n from 'S'", { hasBinding: true, items: 0, typeItems: 0 }],
      ["import {type} from 'S'", { hasBinding: false, items: 1, typeItems: 0 }],
      ["import {type as T} from 'S'", { hasBinding: false, items: 1, typeItems: 0 }],
      ["import {a,} from 'S'", { hasBinding: false, items: 1, typeItems: 0 }],
      ["import {} from 'S'", { hasBinding: false, items: 0, typeItems: 0 }],
      ["import {\n  a,\n  b\n} from 'S'", { hasBinding: false, items: 2, typeItems: 0 }]
    ])('WHEN the clause of %j is read THEN it is %o and next points at from', (text, expected) => {
      expect(clauseOf(text)).toMatchObject(expected);
      expect(nextValueOf(text)).toBe('from');
    });

    it("WHEN the clause of import x = require('S') is read THEN it is a lone binding and next points at =", () => {
      expect(clauseOf("import x = require('S')")).toMatchObject({ hasBinding: true, items: 0, typeItems: 0 });
      expect(nextValueOf("import x = require('S')")).toBe('=');
    });

    it.each([
      "import 'S'",
      "import {a} = require('S')",
      "import x, {a} = require('S')",
      "import * as n = require('S')",
      'import {a',
      "import x, from 'S'"
    ])('WHEN the clause of %j is read THEN it is null', (text) => {
      expect(clauseOf(text)).toBeNull();
    });
  });

  describe('GIVEN an export statement', () => {
    it("WHEN the clause of export * from 'S' is read from after export THEN hasBinding is false and next points at from", () => {
      expect(clauseOf("export * from 'S'")).toMatchObject({ hasBinding: false, items: 0, typeItems: 0 });
      expect(nextValueOf("export * from 'S'")).toBe('from');
    });

    it("WHEN the clause of export * as n from 'S' is read THEN hasBinding is true", () => {
      expect(clauseOf("export * as n from 'S'")).toMatchObject({ hasBinding: true });
    });

    it("WHEN the clause of export {type A, b} from 'S' is read THEN it has 2 items, 1 of them type-only", () => {
      expect(clauseOf("export {type A, b} from 'S'")).toMatchObject({ items: 2, typeItems: 1 });
    });

    it('WHEN the clause of export const x = 1 is read THEN it is null', () => {
      expect(clauseOf('export const x = 1')).toBeNull();
    });
  });
});
