import { describe, expect, it } from 'vitest';

import { moduleGoneTextOf, scanningTextOf } from './module-text.util.ts';

describe('FEATURE: module mode texts', () => {
  describe('GIVEN package web', () => {
    it('WHEN its scan line is written THEN it ends in the ellipsis character', () => {
      expect(scanningTextOf('web')).toBe('Scanning web…');
    });

    it('WHEN its gone notice is written THEN it names the package', () => {
      expect(moduleGoneTextOf('web')).toBe('web is no longer in the workspace');
    });
  });
});
