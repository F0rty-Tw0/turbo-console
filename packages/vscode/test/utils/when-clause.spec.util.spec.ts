import { describe, expect, it } from 'vitest';

import { whenMatches } from './when-clause.spec.util.ts';

const KEYS = { view: 'turboConsole.tree', viewItem: 'turboTask.running', 'turboConsole.scopeShown': true, off: false };

describe('FEATURE: when clause evaluation', () => {
  describe('GIVEN a set of context keys', () => {
    it.each([
      ['a bare key that is set', true, 'turboConsole.scopeShown'],
      ['a bare key that is false', false, 'off'],
      ['a bare key that is not set', false, 'missing'],
      ['a negated key that is set', false, '!turboConsole.scopeShown'],
      ['a negated key that is not set', true, '!missing'],
      ['the constant false', false, 'false'],
      ['the constant true', true, 'true'],
      ['an equality that holds', true, 'view == turboConsole.tree'],
      ['an equality that fails', false, 'view == other'],
      ['an equality on a key that is not set', false, 'missing == x'],
      ['an inequality that holds', true, 'view != other'],
      ['an inequality on a key that is not set', true, 'missing != list'],
      ['a regex that matches', true, 'viewItem =~ /^turboTask\\.running/'],
      ['a regex whose negative lookahead rejects', false, 'viewItem =~ /^turboTask(?!\\.running)/'],
      ['a regex on a key that is not a string', false, 'turboConsole.scopeShown =~ /true/'],
      ['an and whose both sides hold', true, 'view == turboConsole.tree && turboConsole.scopeShown'],
      ['an and with one side false', false, 'view == turboConsole.tree && !turboConsole.scopeShown'],
      ['an or with one side true', true, 'off || view == turboConsole.tree'],
      ['an or whose both sides fail', false, 'off || missing'],
      ['an and binding tighter than an or', true, 'off && missing || view == turboConsole.tree']
    ])('WHEN the clause is %s THEN its match is %s', (_label, isMatch, clause) => {
      expect(whenMatches(clause, KEYS)).toBe(isMatch);
    });

    it.each([
      ['a greater-than comparison', 'count > 1'],
      ['a regex with no closing slash', 'viewItem =~ /^turbo'],
      ['an in expression', 'viewItem in list'],
      ['an empty clause', '']
    ])('WHEN the clause is %s THEN it throws', (_label, clause) => {
      expect(() => whenMatches(clause, KEYS)).toThrow(/unsupported when clause/u);
    });
  });
});
