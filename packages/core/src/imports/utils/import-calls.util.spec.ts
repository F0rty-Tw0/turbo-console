import { describe, expect, it } from 'vitest';

import { dynamicImportAt, requireAt, requireSpecifierAt } from './import-calls.util.ts';
import { sourceTokensOf } from './source-tokens.util.ts';
import type { ImportForm } from '../common/import-scan.type.ts';

const formOf = (kind: ImportForm['kind'], specifier: string, next: number): ImportForm => {
  const form: ImportForm = { specifier, kind, isType: false, start: 0, next };

  return form;
};

describe('FEATURE: reading require and dynamic import calls', () => {
  describe('GIVEN a require call at the first token', () => {
    it("WHEN the specifier of require('S') is read THEN it is the string token S", () => {
      const tokens = sourceTokensOf("require('S')");

      const specifier = requireSpecifierAt(tokens, 0);

      expect(specifier?.value).toBe('S');
    });

    it("WHEN require('S') is read THEN the form ends after the paren", () => {
      const tokens = sourceTokensOf("require('S')");
      const expected = formOf('require', 'S', 4);

      const form = requireAt(tokens, 0);

      expect(form).toStrictEqual(expected);
    });

    const noCallSources = ["require('S'", 'require(x)', 'require.resolve(x)', 'require(`S`)', "other('S')", 'require'];

    it.each(noCallSources)('WHEN the specifier of %j is read THEN it is null', (source) => {
      const tokens = sourceTokensOf(source);

      const specifier = requireSpecifierAt(tokens, 0);

      expect(specifier).toBeNull();
    });

    it.each(noCallSources)('WHEN %j is read THEN it is no require call', (source) => {
      const tokens = sourceTokensOf(source);

      const form = requireAt(tokens, 0);

      expect(form).toBeNull();
    });
  });

  describe('GIVEN a dynamic import at the first token', () => {
    it.each([
      ["import('S')", formOf('dynamic', 'S', 3)],
      ['import(`S`)', formOf('dynamic', 'S', 3)],
      ["import('S', { with: {} })", formOf('dynamic', 'S', 3)]
    ])('WHEN %j is read THEN the form is %j', (source, expected) => {
      const tokens = sourceTokensOf(source);

      const form = dynamicImportAt(tokens, 0);

      expect(form).toStrictEqual(expected);
    });

    it("WHEN import('S') follows typeof THEN it is a type form", () => {
      const tokens = sourceTokensOf("typeof import('S')");
      const expected: ImportForm = { specifier: 'S', kind: 'dynamic', isType: true, start: 7, next: 4 };

      const form = dynamicImportAt(tokens, 1);

      expect(form).toStrictEqual(expected);
    });

    it.each(["import('S'", 'import(x)', 'import(`${x}`)', "import 'S'", "import('S' + x)"])(
      'WHEN %j is read THEN it is no dynamic import',
      (source) => {
        const tokens = sourceTokensOf(source);

        const form = dynamicImportAt(tokens, 0);

        expect(form).toBeNull();
      }
    );
  });
});
