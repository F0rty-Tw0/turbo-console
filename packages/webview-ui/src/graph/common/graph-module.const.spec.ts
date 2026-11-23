import { describe, expect, it } from 'vitest';

import { MODULE_SHOWN_CAP, MODULE_SLOW_TEXT } from './graph-module.const.ts';

describe('FEATURE: module constants', () => {
  describe('GIVEN the spec values (D10, §7.4)', () => {
    it('WHEN read THEN the cap is 300 and the slow text is verbatim', () => {
      expect(MODULE_SHOWN_CAP).toBe(300);
      expect(MODULE_SLOW_TEXT).toBe('Drawing more than 300 items can be slow.');
    });
  });
});
