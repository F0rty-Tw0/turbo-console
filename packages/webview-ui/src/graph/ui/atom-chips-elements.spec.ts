import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildAtomChipRow } from './atom-chips-elements.ts';
import type { GraphAtomCounts } from '../../bridge/common/graph-message.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const ALL_THREE: GraphAtomCounts = { files: 10, cached: 3, failed: 1 };

const isHtmlElement = (element: Element): element is HTMLElement => 'dataset' in element;

const chipsOf = (row: HTMLElement): HTMLElement[] => {
  const children = Array.from(row.children);

  return children.filter(isHtmlElement);
};

const textsOf = (row: HTMLElement): string[] => {
  const chips = chipsOf(row);

  return chips.map((chip) => chip.textContent);
};

/** The row's `index`th chip; a missing one fails the spec. */
const chipAt = (row: HTMLElement, index: number): HTMLElement => {
  const chip = chipsOf(row)[index];

  if (chip === undefined) throw new Error(`the row has no chip ${String(index)}`);

  return chip;
};

const glyphOf = (chip: HTMLElement): HTMLElement | undefined => {
  const children = chipsOf(chip);

  return children.find((child) => child.className.includes('atom-chip-glyph'));
};

/** The glyph of `chip`; a chip without one fails the spec. */
const glyphAt = (chip: HTMLElement): HTMLElement => {
  const glyph = glyphOf(chip);

  if (glyph === undefined) throw new Error('the chip has no glyph');

  return glyph;
};

describe('FEATURE: buildAtomChipRow', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an umbrella’s counts', () => {
    it.each([
      [{ files: 10, cached: 3, failed: 1 }, ['10 files', '3 cached', '1 failed']],
      [{ files: 10, cached: null, failed: null }, ['10 files']],
      [{ files: 10, cached: 9, failed: 0 }, ['10 files', '9 cached']],
      [{ files: 10, cached: null, failed: 2 }, ['10 files', '2 failed']],
      [{ files: 10, cached: null, failed: 0 }, ['10 files']]
    ])('WHEN the row of %j is built THEN the chips read %j', (counts, texts) => {
      const row = buildAtomChipRow(counts, true);

      expect(textsOf(row)).toStrictEqual(texts);
    });
  });

  describe('GIVEN all three chips', () => {
    it('WHEN built with glyphs THEN the classes are files, cached, failed and only the two outlined chips hold a glyph', () => {
      const row = buildAtomChipRow(ALL_THREE, true);
      const classes = chipsOf(row).map((chip) => chip.className);

      expect(classes).toStrictEqual(['atom-chip atom-chip-files', 'atom-chip atom-chip-cached', 'atom-chip atom-chip-failed']);
      expect(glyphOf(chipAt(row, 0))).toBeUndefined();
      expect(glyphAt(chipAt(row, 1)).className).toContain('codicon-history');
      expect(glyphAt(chipAt(row, 2)).className).toContain('codicon-error');
    });

    it('WHEN built glyph-off THEN no chip holds a glyph slot and the texts are unchanged', () => {
      const row = buildAtomChipRow(ALL_THREE, false);
      const chips = chipsOf(row);
      const children = chips.map((chip) => Array.from(chip.children));

      expect(children).toStrictEqual([[], [], []]);
      expect(textsOf(row)).toStrictEqual(['10 files', '3 cached', '1 failed']);
    });

    it('WHEN built THEN the row is an absolute, centred flex row that ignores the pointer', () => {
      const row = buildAtomChipRow(ALL_THREE, true);
      const { position, top, left, transformOrigin, display, justifyContent, alignItems } = row.style;

      expect(row.className).toBe('atom-chips');
      expect([position, top, left, transformOrigin]).toStrictEqual(['absolute', '0px', '0px', '0 0']);
      expect([display, justifyContent, alignItems]).toStrictEqual(['flex', 'center', 'center']);
      expect([row.style.height, row.style.gap, row.style.pointerEvents]).toStrictEqual(['16px', '4px', 'none']);
    });

    it('WHEN built THEN the chip constants are the inline sizes, the line height inside the 1 px border', () => {
      const row = buildAtomChipRow(ALL_THREE, true);
      const chip = chipAt(row, 1);
      const { height, fontSize, paddingLeft, paddingRight, lineHeight } = chip.style;
      const { width, marginRight, fontSize: glyphFontSize } = glyphAt(chip).style;

      expect([height, fontSize, paddingLeft, paddingRight, lineHeight]).toStrictEqual(['16px', '11px', '6px', '6px', '14px']);
      expect([width, marginRight, glyphFontSize]).toStrictEqual(['12px', '3px', '12px']);
    });
  });
});
