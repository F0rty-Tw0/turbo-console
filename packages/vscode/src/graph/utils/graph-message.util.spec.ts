import { describe, expect, it } from 'vitest';

import { parseGraphMessage } from './graph-message.util.ts';

const POINT = { x: 1, y: 2 };
const POSITIONS = { a: POINT };
const POINT_WITHOUT_Y = { x: 1 };
const POSITIONS_WITHOUT_Y = { a: POINT_WITHOUT_Y };
const POINT_WITH_EXTRA = { x: 1, y: 2, z: 3 };
const POSITIONS_WITH_EXTRA = { a: POINT_WITH_EXTRA };
const THROWING_TYPE = {
  get type(): string {
    throw new Error('getter trap');
  }
};

describe('FEATURE: graph webview message validation', () => {
  describe('GIVEN a message of every valid type', () => {
    it.each([
      { type: 'ready' },
      { type: 'reload' },
      { type: 'openDetails', packageName: 'web' },
      { type: 'positions', hash: 'h', positions: POSITIONS },
      { type: 'layoutDone', ms: 12, engine: 'elk' },
      { type: 'layoutDone', ms: 3, engine: 'fallback' }
    ])('WHEN parsed THEN $type passes unchanged', (message) => {
      expect(parseGraphMessage(message)).toStrictEqual(message);
    });
  });

  describe('GIVEN a message with unknown keys', () => {
    it('WHEN parsed THEN the keys are stripped, at the top and inside a point', () => {
      const raw = { type: 'positions', hash: 'h', extra: 1, positions: POSITIONS_WITH_EXTRA };

      expect(parseGraphMessage(raw)).toStrictEqual({ type: 'positions', hash: 'h', positions: POSITIONS });
    });
  });

  describe('GIVEN a value that is not a graph message', () => {
    it.each([
      ['undefined', undefined],
      ['an unknown type', { type: 'nope' }],
      ['an openDetails without a name', { type: 'openDetails' }],
      ['a point missing y', { type: 'positions', hash: 'h', positions: POSITIONS_WITHOUT_Y }],
      ['an unknown engine', { type: 'layoutDone', ms: 1, engine: 'webgl' }],
      ['a throwing getter', THROWING_TYPE]
    ])('WHEN parsed THEN %s is null', (_label, raw) => {
      expect(parseGraphMessage(raw)).toBeNull();
    });
  });
});
