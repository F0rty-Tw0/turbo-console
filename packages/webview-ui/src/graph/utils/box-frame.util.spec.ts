import { describe, expect, it } from 'vitest';

import { isBoxFrame } from './box-frame.util.ts';
import type { BoxFrame } from '../common/layout.type.ts';

const FRAME: BoxFrame = { leafId: 'api#build', left: -75, right: 75, top: -57, bottom: 63, titleX: -35, titleY: -49 };

describe('FEATURE: isBoxFrame', () => {
  describe('GIVEN a value read back from box data', () => {
    it('WHEN it is a whole frame THEN it is a frame', () => {
      expect(isBoxFrame(FRAME)).toBe(true);
    });

    it('WHEN it is undefined, as on a box never framed THEN it is not a frame', () => {
      expect(isBoxFrame(undefined)).toBe(false);
    });

    it('WHEN it is null THEN it is not a frame', () => {
      expect(isBoxFrame(null)).toBe(false);
    });

    it('WHEN its leaf id is not a string THEN it is not a frame', () => {
      const value = { ...FRAME, leafId: 7 };

      expect(isBoxFrame(value)).toBe(false);
    });

    it('WHEN a side is missing THEN it is not a frame', () => {
      const value = { ...FRAME, bottom: undefined };

      expect(isBoxFrame(value)).toBe(false);
    });
  });
});
