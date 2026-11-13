import { describe, expect, it } from 'vitest';

import { swatchPartsOf } from './legend-swatch.util.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import { BOX_SWATCH, LINE_SWATCH, PILL_SWATCH } from '../common/legend-swatch.const.ts';
import { TASK_LEGEND_ROWS } from '../common/legend-task.const.ts';
import type { LegendHalo, LegendOutline, LegendSwatch, SvgPart } from '../common/legend.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { SELECTION_COLORS_STUB, THEME_COLORS_STUB } from '../test/stubs/theme-colors.stub.ts';

const SELECTION = SELECTION_COLORS_STUB;

const COLORS = THEME_COLORS_STUB;

const FAILED_OUTLINE: LegendOutline = { colour: 'run-failed', px: 2 };

const CACHED_OUTLINE: LegendOutline = { colour: 'cached', px: 2 };

const FLOW_PEN: LegendOutline = { colour: 'background', px: 2 };

const HALO: LegendHalo = { colour: 'affected', opacity: 0.4 };

const FLOW: LegendSwatch = {
  ...LINE_SWATCH,
  shape: 'flow',
  stroke: 'highlighted',
  strokePx: 1.25,
  dashPx: [6, 6],
  outline: FLOW_PEN
};

/** Stands in for a part the swatch does not draw, so a read of it fails on its tag or its attributes. */
const NO_PART: SvgPart = { tag: 'path', attrs: {}, text: '' };

const boxOf = (overrides: Partial<LegendSwatch>): LegendSwatch => {
  const swatch: LegendSwatch = { ...BOX_SWATCH, ...overrides };

  return swatch;
};

const partsOf = (swatch: LegendSwatch, colors: ThemeColors = COLORS): SvgPart[] => swatchPartsOf(swatch, colors);

const partAt = (parts: SvgPart[], index: number): SvgPart => parts[index] ?? NO_PART;

const tagsOf = (parts: SvgPart[]): string[] => parts.map((part): string => part.tag);

const textPartOf = (parts: SvgPart[]): SvgPart => parts.find((part): boolean => part.tag === 'text') ?? NO_PART;

describe('FEATURE: swatchPartsOf', () => {
  describe('GIVEN a box swatch', () => {
    it('WHEN it is solid THEN its rect carries the frame, the width and the fill, and no dash', () => {
      const rect = partAt(partsOf(BOX_SWATCH), 0);

      expect(rect.attrs).toMatchObject({ stroke: COLORS.frame, 'stroke-width': '1', fill: COLORS.background });
      expect(rect.attrs['stroke-dasharray']).toBeUndefined();
    });

    it('WHEN it is dashed THEN the dasharray is the pattern joined by spaces', () => {
      const rect = partAt(partsOf(boxOf({ dashPx: [4, 2] })), 0);

      expect(rect.attrs['stroke-dasharray']).toBe('4 2');
    });

    it('WHEN the corners are 6 and 8 px on a 32 px node THEN the rx scale by 14 / 32 to the 14 high rect', () => {
      const pkg = partAt(partsOf(BOX_SWATCH), 0);
      const folder = partAt(partsOf(boxOf({ radiusPx: 8 })), 0);

      expect(pkg.attrs['rx']).toBe('2.625');
      expect(folder.attrs['rx']).toBe('3.5');
    });

    it('WHEN it has no fill THEN the rect is not filled', () => {
      const rect = partAt(partsOf(boxOf({ fill: null })), 0);

      expect(rect.attrs['fill']).toBe('none');
    });

    it('WHEN it is read THEN the sample text Aa follows the rect in the label colour', () => {
      const parts = partsOf(BOX_SWATCH);
      const text = partAt(parts, 1);

      expect([tagsOf(parts), text.text, text.attrs['fill']]).toStrictEqual([['rect', 'text'], 'Aa', COLORS.label]);
    });

    it.each([
      [true, 'bold'],
      [false, 'normal']
    ])('WHEN isBold is %s THEN the sample text weighs %s', (isBold, weight) => {
      const text = textPartOf(partsOf(boxOf({ isBold })));

      expect(text.attrs['font-weight']).toBe(weight);
    });

    it('WHEN it has an outline THEN a transparent rect in the outline colour and width comes first', () => {
      const parts = partsOf(boxOf({ outline: FAILED_OUTLINE }));

      expect(partAt(parts, 0).attrs).toMatchObject({ stroke: COLORS.runs.failed, 'stroke-width': '2', fill: 'none' });
      expect(partAt(parts, 1).attrs['stroke']).toBe(COLORS.frame);
    });

    it('WHEN its outline is the continuous run colour THEN the outline rect strokes in it', () => {
      const continuous: LegendOutline = { colour: 'run-continuous', px: 2 };

      const parts = partsOf(boxOf({ outline: continuous }));

      expect(partAt(parts, 0).attrs['stroke']).toBe(COLORS.runs.continuous);
    });

    it('WHEN it has an outline THEN the outline rect is grown by half the frame and outline widths on each side', () => {
      const outline = partAt(partsOf(boxOf({ outline: CACHED_OUTLINE })), 0);

      expect(outline.attrs).toMatchObject({ x: '1.5', y: '1.5', width: '37', height: '17', stroke: COLORS.cached });
    });

    it('WHEN it has a halo THEN an unstroked rect in the affected colour at the halo opacity comes first, then the frame', () => {
      const parts = partsOf(boxOf({ halo: HALO }));

      expect(partAt(parts, 0).attrs).toMatchObject({ stroke: 'none', fill: COLORS.affected, 'fill-opacity': '0.4' });
      expect(partAt(parts, 1).attrs['stroke']).toBe(COLORS.frame);
    });

    it('WHEN it has a halo THEN the halo rect is grown by 2 on each side of the frame, corners included', () => {
      const halo = partAt(partsOf(boxOf({ halo: HALO })), 0);

      expect(halo.attrs).toMatchObject({ x: '1', y: '1', width: '38', height: '18', rx: '4.625' });
    });

    it('WHEN it is nested THEN there are two rects and no sample text', () => {
      const parts = partsOf(boxOf({ isNested: true }));

      expect([tagsOf(parts), partAt(parts, 1).attrs['fill']]).toStrictEqual([['rect', 'rect'], COLORS.background]);
    });
  });

  describe('GIVEN the selection fill', () => {
    const selected = boxOf({ fill: 'selectionFill' });

    it('WHEN the theme sets one THEN a selected box is filled with it', () => {
      const rect = partAt(partsOf(selected), 0);

      expect(rect.attrs['fill']).toBe(SELECTION.fill);
    });

    it('WHEN it is unset (high contrast) THEN a selected box falls back to the background', () => {
      const noSelection: ThemeColors = { ...COLORS, selection: null };
      const rect = partAt(partsOf(selected, noSelection), 0);

      expect(rect.attrs['fill']).toBe(COLORS.background);
    });
  });

  describe('GIVEN the selection label', () => {
    const selected = boxOf({ fill: 'selectionFill' });

    it('WHEN the theme sets one THEN the sample text of a selected box takes it', () => {
      const text = textPartOf(partsOf(selected));

      expect(text.attrs['fill']).toBe(SELECTION.label);
    });

    it('WHEN it is unset (high contrast) THEN the sample text falls back to the label colour', () => {
      const noSelection: ThemeColors = { ...COLORS, selection: null };
      const text = textPartOf(partsOf(selected, noSelection));

      expect(text.attrs['fill']).toBe(COLORS.label);
    });
  });

  it('GIVEN a pill swatch WHEN it is read THEN the rect is 10 high with 5 px corners', () => {
    const rect = partAt(partsOf(PILL_SWATCH), 0);

    expect(rect.attrs).toMatchObject({ y: '5', height: '10', rx: '5' });
  });

  describe('GIVEN a line swatch', () => {
    it('WHEN it has an arrow THEN the line and the arrow head use the edge colour', () => {
      const parts = partsOf({ ...LINE_SWATCH, isArrow: true });

      expect(tagsOf(parts)).toStrictEqual(['line', 'path']);
      expect(partAt(parts, 0).attrs).toMatchObject({ stroke: COLORS.edge, 'stroke-width': '0.75' });
      expect(partAt(parts, 1).attrs['fill']).toBe(COLORS.edge);
    });

    it('WHEN it has a plate THEN a background rect and the text n sit on the line', () => {
      const parts = partsOf({ ...LINE_SWATCH, hasPlate: true });

      expect([tagsOf(parts), partAt(parts, 1).attrs['fill'], partAt(parts, 2).text]).toStrictEqual([
        ['line', 'rect', 'text'],
        COLORS.background,
        'n'
      ]);
    });

    it('WHEN it is plain THEN it draws the line only', () => {
      expect(tagsOf(partsOf(LINE_SWATCH))).toStrictEqual(['line']);
    });
  });

  describe('GIVEN a flow swatch', () => {
    it('WHEN it is read THEN the highlighted line comes first, undashed', () => {
      const line = partAt(partsOf(FLOW), 0);

      expect([line.attrs['stroke'], line.attrs['stroke-dasharray']]).toStrictEqual([COLORS.highlighted, undefined]);
    });

    it('WHEN it is read THEN a background dash pen runs over the line', () => {
      const pen = partAt(partsOf(FLOW), 1);

      expect(pen.attrs).toMatchObject({ stroke: COLORS.background, 'stroke-width': '2', 'stroke-dasharray': '6 6' });
    });
  });

  describe('GIVEN a card swatch with an accent bar', () => {
    const card = boxOf({ fill: 'cardFill', stroke: 'cardFrame', accentBar: 'run-failed' });

    it('WHEN it is read THEN the frame rect carries the card fill and frame', () => {
      expect(partAt(partsOf(card), 0).attrs).toMatchObject({ fill: COLORS.cardFill, stroke: COLORS.cardFrame });
    });

    it('WHEN it is read THEN a path in the failed colour follows the frame, 3 units tall inside its stroke, then the sample text', () => {
      const parts = partsOf(card);

      expect(tagsOf(parts)).toStrictEqual(['rect', 'path', 'text']);
      expect(partAt(parts, 1).attrs).toStrictEqual({
        d: 'M3.5 6.5 V5.625 A2.125 2.125 0 0 1 5.625 3.5 H34.375 A2.125 2.125 0 0 1 36.5 5.625 V6.5 Z',
        fill: COLORS.runs.failed
      });
    });

    it('WHEN accentBar is null THEN there is no path', () => {
      expect(tagsOf(partsOf(BOX_SWATCH))).toStrictEqual(['rect', 'text']);
    });
  });

  it('GIVEN the task legend WHEN its run rows are read THEN each is a card swatch with the bar of its own state and no outline', () => {
    const runRows = TASK_LEGEND_ROWS.filter((row) => row.id.startsWith('run-'));
    const looks = runRows.map((row) => [row.swatch.accentBar, row.swatch.fill, row.swatch.stroke, row.swatch.outline]);

    expect(looks).toStrictEqual(RUN_STATES.map((state) => [`run-${state}`, 'cardFill', 'cardFrame', null]));
  });
});
