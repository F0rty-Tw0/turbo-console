import { describe, expect, it, vi } from 'vitest';

import { boxTitleSizerOf, labelSizer, packageTitleSizer, slotSizer, taskSizerOf } from './label-measure.ts';
import { GLYPH_CODE_POINTS, PACKAGE_GLYPH } from '../common/graph-glyph.const.ts';
import type { TextMeasure } from '../common/graph-page.type.ts';
import { nodeSizeOf } from '../utils/node-size.util.ts';

const MEASURED_WIDTH = 40;
const GLYPH_MEASURED_WIDTH = 90;

const measureOf = (): ReturnType<typeof vi.fn<TextMeasure>> => vi.fn<TextMeasure>((): number => MEASURED_WIDTH);

const glyphMeasureOf = (): ReturnType<typeof vi.fn<TextMeasure>> => vi.fn<TextMeasure>((): number => GLYPH_MEASURED_WIDTH);

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

    it('WHEN the package title sizer sizes web THEN it measures the package glyph, a space and the name', () => {
      const measure = measureOf();

      packageTitleSizer(measure)('web');

      expect(measure).toHaveBeenCalledExactlyOnceWith(`${PACKAGE_GLYPH} web`);
    });

    it('WHEN the package title sizer sizes web THEN it returns the node size of the measured width', () => {
      const size = packageTitleSizer(measureOf())('web');

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

  describe('GIVEN a plain measure of 40 and a codicon measure of 90', () => {
    describe('AND the page draws glyphs', () => {
      it('WHEN the task sizer sizes build THEN it measures the blank glyph slot in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        taskSizerOf(true, measureOf(), glyphMeasure)('build');

        expect(glyphMeasure).toHaveBeenCalledExactlyOnceWith(`${GLYPH_CODE_POINTS.blank} build`);
      });

      it('WHEN the task sizer sizes build THEN it returns the node size of the codicon width', () => {
        const size = taskSizerOf(true, measureOf(), glyphMeasureOf())('build');

        expect(size).toStrictEqual(nodeSizeOf(GLYPH_MEASURED_WIDTH));
      });

      it('WHEN the box title sizer sizes web THEN it measures the package glyph and the name in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        boxTitleSizerOf(true, measureOf(), glyphMeasure)('web');

        expect(glyphMeasure).toHaveBeenCalledExactlyOnceWith(`${PACKAGE_GLYPH} web`);
      });

      it('WHEN the box title sizer sizes web THEN it returns the node size of the codicon width', () => {
        const size = boxTitleSizerOf(true, measureOf(), glyphMeasureOf())('web');

        expect(size).toStrictEqual(nodeSizeOf(GLYPH_MEASURED_WIDTH));
      });
    });

    describe('AND the page draws no glyphs', () => {
      it('WHEN the task sizer sizes build THEN it returns the node size of the bare label', () => {
        const size = taskSizerOf(false, measureOf(), glyphMeasureOf())('build');

        expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
      });

      it('WHEN the task sizer sizes build THEN it never measures in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        taskSizerOf(false, measureOf(), glyphMeasure)('build');

        expect(glyphMeasure).not.toHaveBeenCalled();
      });

      it('WHEN the box title sizer sizes web THEN it returns the node size of the bare name', () => {
        const size = boxTitleSizerOf(false, measureOf(), glyphMeasureOf())('web');

        expect(size).toStrictEqual(nodeSizeOf(MEASURED_WIDTH));
      });

      it('WHEN the box title sizer sizes web THEN it never measures in the codicon font', () => {
        const glyphMeasure = glyphMeasureOf();

        boxTitleSizerOf(false, measureOf(), glyphMeasure)('web');

        expect(glyphMeasure).not.toHaveBeenCalled();
      });
    });
  });
});
