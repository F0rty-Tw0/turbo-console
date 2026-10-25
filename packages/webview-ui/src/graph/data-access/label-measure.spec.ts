import { describe, expect, it, vi } from 'vitest';

import { labelSizer, slotSizer } from './label-measure.ts';
import type { TextMeasure } from '../common/graph-page.type.ts';
import { nodeSizeOf } from '../utils/node-size.util.ts';

const MEASURED_WIDTH = 40;

const measureOf = (): ReturnType<typeof vi.fn<TextMeasure>> => vi.fn<TextMeasure>((): number => MEASURED_WIDTH);

describe('FEATURE: label-measure', () => {
  describe('GIVEN a measure that records its text and returns 40', () => {
    it('WHEN the slot sizer sizes build THEN it measures the blank glyph, a space and the name', () => {
      const measure = measureOf();

      slotSizer(measure)('build');

      expect(measure).toHaveBeenCalledExactlyOnceWith('\uec03 build');
    });

    it('WHEN the slot sizer sizes build THEN it returns the node size of the measured width', () => {
      const size = slotSizer(measureOf())('build');

      expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
    });

    it('WHEN the label sizer sizes build THEN it measures the bare name', () => {
      const measure = measureOf();

      labelSizer(measure)('build');

      expect(measure).toHaveBeenCalledExactlyOnceWith('build');
    });

    it('WHEN the label sizer sizes build THEN it returns the node size of the measured width', () => {
      const size = labelSizer(measureOf())('build');

      expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
    });
  });
});
