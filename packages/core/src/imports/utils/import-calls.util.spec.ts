import { describe, expect, it } from 'vitest';

import { dynamicImportAt, requireAt, requireSpecifierAt } from './import-calls.util.ts';
import { sourceTokensOf } from './source-tokens.util.ts';
import type { ImportForm } from '../common/import-scan.type.ts';

const formOf = (kind: ImportForm['kind'], specifier: string, next: number, isType = false): ImportForm => {
  const form: ImportForm = { specifier, kind, isType, start: 0, next };

  return form;
};

describe('FEATURE: reading require and dynamic import calls', () => {
  describe('GIVEN a require call at the first token', () => {
    it("WHEN require('S') is read THEN the string token is the specifier and the form ends after the paren", () => {
      const tokens = sourceTokensOf("require('S')");

      expect(requireSpecifierAt(tokens, 0)?.value).toBe('S');
      expect(requireAt(tokens, 0)).toStrictEqual(formOf('require', 'S', 4));
    });

    it.each(["require('S'", 'require(x)', 'require.resolve(x)', 'require(`S`)', "other('S')", 'require'])(
      'WHEN %j is read THEN it is no require call',
      (source) => {
        const tokens = sourceTokensOf(source);

        expect(requireSpecifierAt(tokens, 0)).toBeNull();
        expect(requireAt(tokens, 0)).toBeNull();
      }
    );
  });

  describe('GIVEN a dynamic import at the first token', () => {
    it.each([
      ["import('S')", formOf('dynamic', 'S', 3)],
      ['import(`S`)', formOf('dynamic', 'S', 3)],
      ["import('S', { with: {} })", formOf('dynamic', 'S', 3)]
    ])('WHEN %j is read THEN the form is %j', (source, expected) => {
      expect(dynamicImportAt(sourceTokensOf(source), 0)).toStrictEqual(expected);
    });

    it("WHEN import('S') follows typeof THEN it is a type form", () => {
      const tokens = sourceTokensOf("typeof import('S')");

      const typeForm = formOf('dynamic', 'S', 4, true);

      expect(dynamicImportAt(tokens, 1)).toStrictEqual({ ...typeForm, start: 7 });
    });

    it.each(["import('S'", 'import(x)', 'import(`${x}`)', "import 'S'", "import('S' + x)"])(
      'WHEN %j is read THEN it is no dynamic import',
      (source) => {
        expect(dynamicImportAt(sourceTokensOf(source), 0)).toBeNull();
      }
    );
  });
});
