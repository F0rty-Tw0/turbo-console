import { describe, expect, it } from 'vitest';

import { droppedGraphText, parseGraphMessage } from './graph-message.util.ts';
import { UNPRINTABLE_MESSAGE } from '../../shared/common/panel.const.ts';

const HASH = 'dc7e01eb';
const LONG_NAME = 'n'.repeat(215);
const POINT = { x: 1, y: 2 };
const POSITIONS = { a: POINT };
const POINT_WITHOUT_Y = { x: 1 };
const POSITIONS_WITHOUT_Y = { a: POINT_WITHOUT_Y };
const POINT_WITH_EXTRA = { x: 1, y: 2, z: 3 };
const POSITIONS_WITH_EXTRA = { a: POINT_WITH_EXTRA };
const FAR_POINT = { x: 1e7 + 1, y: 0 };
const LONG_KEY_POSITIONS = { [LONG_NAME]: POINT };
const FAR_POSITIONS = { a: FAR_POINT };
const THROWING_TYPE = {
  get type(): string {
    throw new Error('getter trap');
  }
};
const THROWING_POSITIONS = {
  type: 'positions',
  get positions(): never {
    throw new Error('getter trap');
  }
};

/** A `positions` message whose record has `count` keys. */
const positionsWith = (count: number): Record<string, unknown> => {
  const entries = Array.from({ length: count }, (_, index): [string, typeof POINT] => [`p${index}`, POINT]);
  const message = { type: 'positions', hash: HASH, positions: Object.fromEntries(entries) };

  return message;
};

describe('FEATURE: graph webview message validation', () => {
  describe('GIVEN a message of every valid type', () => {
    it.each([
      { type: 'ready' },
      { type: 'reload' },
      { type: 'openDetails', packageName: 'web' },
      { type: 'positions', hash: HASH, positions: POSITIONS },
      { type: 'layoutDone', ms: 12, engine: 'elk' },
      { type: 'layoutDone', ms: 3, engine: 'fallback' }
    ])('WHEN parsed THEN $type passes unchanged', (message) => {
      expect(parseGraphMessage(message)).toStrictEqual(message);
    });
  });

  describe('GIVEN a message with unknown keys', () => {
    it('WHEN parsed THEN the keys are stripped, at the top and inside a point', () => {
      const raw = { type: 'positions', hash: HASH, extra: 1, positions: POSITIONS_WITH_EXTRA };

      expect(parseGraphMessage(raw)).toStrictEqual({ type: 'positions', hash: HASH, positions: POSITIONS });
    });
  });

  describe('GIVEN a value that is not a graph message', () => {
    it.each([
      ['undefined', undefined],
      ['an unknown type', { type: 'nope' }],
      ['an openDetails without a name', { type: 'openDetails' }],
      ['a point missing y', { type: 'positions', hash: HASH, positions: POSITIONS_WITHOUT_Y }],
      ['a hash that is not eight hex digits', { type: 'positions', hash: 'h', positions: POSITIONS }],
      ['an upper-case hash', { type: 'positions', hash: 'DC7E01EB', positions: POSITIONS }],
      ['a package name past 214 units', { type: 'openDetails', packageName: LONG_NAME }],
      ['a position key past 214 units', { type: 'positions', hash: HASH, positions: LONG_KEY_POSITIONS }],
      ['a coordinate past 1e7', { type: 'positions', hash: HASH, positions: FAR_POSITIONS }],
      ['a positions record past 5000 keys', positionsWith(5001)],
      ['an unknown engine', { type: 'layoutDone', ms: 1, engine: 'webgl' }],
      ['a throwing getter', THROWING_TYPE],
      ['a throwing positions getter', THROWING_POSITIONS]
    ])('WHEN parsed THEN %s is null', (_label, raw) => {
      expect(parseGraphMessage(raw)).toBeNull();
    });
  });

  describe('GIVEN a positions record of exactly 5000 keys', () => {
    it('WHEN parsed THEN it passes', () => {
      expect(parseGraphMessage(positionsWith(5000))).not.toBeNull();
    });
  });
});

describe('FEATURE: dropped graph message log text', () => {
  it('GIVEN a small message WHEN logged THEN the text is its JSON', () => {
    expect(droppedGraphText({ type: 'nope' })).toBe('{"type":"nope"}');
  });

  it('GIVEN a positions record past 5000 keys WHEN logged THEN the text is only its size', () => {
    expect(droppedGraphText(positionsWith(5001))).toBe('positions with 5001 keys');
  });

  it('GIVEN a throwing positions getter WHEN logged THEN the text is the unprintable marker', () => {
    expect(droppedGraphText(THROWING_POSITIONS)).toBe(UNPRINTABLE_MESSAGE);
  });
});
