import { describe, expect, it } from 'vitest';

import { moduleRulesOf } from './graph-module-style.ts';
import { THEME_COLORS_STUB } from '../test/stubs/theme-colors.stub.ts';

describe('FEATURE: moduleRulesOf', () => {
  describe('GIVEN the module link rules', () => {
    it.each([
      ['edge.module-lazy', 'line-style', 'dotted'],
      ['edge.module-type', 'line-style', 'dashed'],
      ['node.module-stub', 'border-style', 'dashed'],
      ['edge.module-link', 'label', 'data(count)'],
      ['edge.module-link', 'min-zoomed-font-size', 5]
    ])('WHEN %s is read THEN %s is %s', (selector, property, value) => {
      const rule = moduleRulesOf(THEME_COLORS_STUB, 'sans').find((entry) => entry.selector === selector);
      const style = new Map(Object.entries(rule?.style ?? {}));

      expect(style.get(property)).toBe(value);
    });
  });
});
