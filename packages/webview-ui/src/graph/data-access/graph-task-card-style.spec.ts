import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import type { CardMeasures } from '../common/graph-card.type.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const BLANK = String.fromCodePoint(0xec03);
const SYNC = String.fromCodePoint(0xea77);
const PASS = String.fromCodePoint(0xeba4);

/** Seven px per character regular, eight bold: a block's width reads straight off its character count. */
const MEASURES: CardMeasures = { regular: (text) => text.length * 7, bold: (text) => text.length * 8 };

const CARD_DATA = { id: 'api#build', label: 'build', width: 180, height: 60 };

const LONG_DATA = { ...CARD_DATA, label: 'a'.repeat(40), width: 360 };

describe('FEATURE: card rules in graphStyleOf', () => {
  let cy: Core;

  const nodeOf = (classes: string, glyphs = true, data = CARD_DATA): NodeSingular => {
    const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', glyphs, MEASURES);
    const elements = [{ data, classes }];

    cy = cytoscape({ headless: true, styleEnabled: true, style, elements });

    return cy.getElementById(data.id);
  };

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN an idle card with glyphs', () => {
    it('THEN the label is the blank glyph and the name over Not run', () => {
      expect(nodeOf('task task-card').style('label')).toBe(`${BLANK} build\nNot run`);
    });

    it('THEN the label wraps only at the newline, left-justified, in a block 24 px wider than the card', () => {
      const node = nodeOf('task task-card');
      const wrap: unknown[] = [
        node.style('text-wrap'),
        node.style('text-justification'),
        node.numericStyle('line-height'),
        node.numericStyle('text-max-width')
      ];

      expect(wrap).toStrictEqual(['wrap', 'left', 1.4, 204]);
    });

    it('THEN the margin is -53.5 (both rows 49 px)', () => {
      expect(nodeOf('task task-card').numericStyle('text-margin-x')).toBe(-53.5);
    });
  });

  describe('GIVEN the widest state word', () => {
    it('THEN row 2 sets the block at the regular weight', () => {
      expect(nodeOf('task task-card run-failed-to-start').numericStyle('text-margin-x')).toBe(-25.5);
    });

    it('THEN a selected card measures at bold', () => {
      expect(nodeOf('task task-card run-failed-to-start selected').numericStyle('text-margin-x')).toBe(-18);
    });

    it('THEN a focus target that is not selected measures at bold too', () => {
      expect(nodeOf('task task-card run-failed-to-start focus-target').numericStyle('text-margin-x')).toBe(-18);
    });
  });

  describe('GIVEN a name wider than the card less its padding', () => {
    it('THEN the margin follows row 1 of the 360 px card', () => {
      expect(nodeOf('task task-card', true, LONG_DATA).numericStyle('text-margin-x')).toBe(-21);
    });

    it('THEN a selected one measures bold and fills the block', () => {
      expect(nodeOf('task task-card selected', true, LONG_DATA).numericStyle('text-margin-x')).toBe(0);
    });
  });

  describe('GIVEN a card with clock data', () => {
    const CLOCKED = { ...CARD_DATA, clock: '1m 4s' };

    it('GIVEN a running card THEN row 2 reads Running · 1m 4s', () => {
      expect(nodeOf('task task-card run-running', true, CLOCKED).style('label')).toBe(`${SYNC} build\nRunning · 1m 4s`);
    });

    it('GIVEN an ended card with stale clock data THEN row 2 is the plain word', () => {
      expect(nodeOf('task task-card run-passed', true, CLOCKED).style('label')).toBe(`${PASS} build\nPassed`);
    });

    it('GIVEN a running card THEN the margin measures row 2 with the clock: 15 chars = 105 px, (105 - 156) / 2', () => {
      expect(nodeOf('task task-card run-running', true, CLOCKED).numericStyle('text-margin-x')).toBe(-25.5);
    });

    it('GIVEN row 2 wider than row 1 only with the clock THEN the margin is -15, not the -43 of the bare word', () => {
      const data = { ...CARD_DATA, clock: '1h 2m' };

      expect(nodeOf('task task-card run-continuous', true, data).numericStyle('text-margin-x')).toBe(-15);
      expect(nodeOf('task task-card run-continuous').numericStyle('text-margin-x')).toBe(-43);
    });

    it('GIVEN a long name THEN the clock never moves the margin (-21 with and without)', () => {
      const clocked = { ...LONG_DATA, clock: '1m 4s' };

      expect(nodeOf('task task-card run-running', true, clocked).numericStyle('text-margin-x')).toBe(-21);
      expect(nodeOf('task task-card run-running', true, LONG_DATA).numericStyle('text-margin-x')).toBe(-21);
    });
  });

  describe('GIVEN a page without the glyph font', () => {
    it('THEN the label is the bare name over Not run and the margin is -53.5', () => {
      const node = nodeOf('task task-card', false);

      expect([node.style('label'), node.numericStyle('text-margin-x')]).toStrictEqual(['build\nNot run', -53.5]);
    });
  });

  describe('GIVEN an umbrella', () => {
    it('THEN it keeps a one-row label', () => {
      const label: unknown = nodeOf('task atom-umbrella').style('label');

      expect(label).toBe(`${BLANK} build`);
    });

    it('THEN it has no margin', () => {
      expect(nodeOf('task atom-umbrella').numericStyle('text-margin-x')).toBe(0);
    });
  });
});
