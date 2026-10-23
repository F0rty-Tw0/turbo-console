import type { GraphWebviewMessage, Positions } from '@turbo-console/webview-ui';
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
const LONG_KEY_POSITIONS = { [LONG_NAME]: POINT };
const MAX_X_MIN_Y = { x: 1e7, y: -1e7 };
const MIN_X_MAX_Y = { x: -1e7, y: 1e7 };
const LIMIT_POSITIONS = { a: MAX_X_MIN_Y, b: MIN_X_MAX_Y };
const PROTO_MESSAGE_JSON = `{"type":"positions","hash":"${HASH}","positions":{"__proto__":{"x":1,"y":2},"a":{"x":3,"y":4}},"grouping":"flat"}`;
const INHERITING_POSITIONS: unknown = Object.create(POSITIONS);
const THROWING_TYPE = {
  get type(): string {
    throw new Error('getter trap');
  }
};
const THROWING_POSITIONS = {
  type: 'positions',
  grouping: 'flat',
  get positions(): never {
    throw new Error('getter trap');
  }
};

/** The positions of a parsed `positions` message, else `null`. */
const positionsIn = (parsed: GraphWebviewMessage | null): Positions | null => {
  if (parsed?.type !== 'positions') return null;

  return parsed.positions;
};

/** A `positions` message whose record has `count` keys. */
const positionsWith = (count: number): Record<string, unknown> => {
  const entries = Array.from({ length: count }, (_, index): [string, typeof POINT] => [`p${index}`, POINT]);
  const message = { type: 'positions', hash: HASH, positions: Object.fromEntries(entries), grouping: 'flat' };

  return message;
};

describe('FEATURE: graph webview message validation', () => {
  describe('GIVEN a message of every valid type', () => {
    it.each([
      { type: 'ready' },
      { type: 'reload' },
      { type: 'openDetails', packageName: 'web' },
      { type: 'positions', hash: HASH, positions: POSITIONS, grouping: 'flat' },
      { type: 'layoutDone', ms: 12, engine: 'elk' },
      { type: 'layoutDone', ms: 3, engine: 'fallback' },
      { type: 'explainEdge', source: 'web', target: 'core' },
      { type: 'openManifest', packageName: 'web', line: 0 },
      { type: 'openManifest', packageName: 'web', line: 1_000_000 },
      { type: 'explainEdge', source: '__proto__', target: 'constructor' },
      { type: 'exportImage', png: 'iVBORw0KGgo=' }
    ])('WHEN parsed THEN $type passes unchanged', (message) => {
      expect(parseGraphMessage(message)).toStrictEqual(message);
    });
  });

  describe('GIVEN a positions post with a grouping', () => {
    it.each([['folders'], ['flat']])('WHEN the grouping is %s THEN it is kept', (grouping) => {
      const raw = { type: 'positions', hash: HASH, positions: POSITIONS, grouping };

      expect(parseGraphMessage(raw)).toStrictEqual(raw);
    });

    it.each([
      ['no grouping', { type: 'positions', hash: HASH, positions: POSITIONS }],
      ['an unknown grouping', { type: 'positions', hash: HASH, positions: POSITIONS, grouping: 'grid' }],
      ['a numeric grouping', { type: 'positions', hash: HASH, positions: POSITIONS, grouping: 1 }]
    ])('WHEN it has %s THEN it is null', (_label, raw) => {
      expect(parseGraphMessage(raw)).toBeNull();
    });
  });

  describe('GIVEN a message with unknown keys', () => {
    it('WHEN parsed THEN the keys are stripped, at the top and inside a point', () => {
      const raw = { type: 'positions', hash: HASH, extra: 1, positions: POSITIONS_WITH_EXTRA, grouping: 'flat' };

      expect(parseGraphMessage(raw)).toStrictEqual({ type: 'positions', hash: HASH, positions: POSITIONS, grouping: 'flat' });
    });
  });

  describe('GIVEN a value that is not a graph message', () => {
    it.each([
      ['undefined', undefined],
      ['an unknown type', { type: 'nope' }],
      ['an openDetails without a name', { type: 'openDetails' }],
      ['an explainEdge without a target', { type: 'explainEdge', source: 'web' }],
      ['an explainEdge source past 214 units', { type: 'explainEdge', source: LONG_NAME, target: 'core' }],
      ['an explainEdge target past 214 units', { type: 'explainEdge', source: 'web', target: LONG_NAME }],
      ['an openManifest without a line', { type: 'openManifest', packageName: 'web' }],
      ['an openManifest with line -1', { type: 'openManifest', packageName: 'web', line: -1 }],
      ['an openManifest with line 1 000 001', { type: 'openManifest', packageName: 'web', line: 1_000_001 }],
      ['an openManifest with a fractional line', { type: 'openManifest', packageName: 'web', line: 1.5 }],
      ['an openManifest with a NaN line', { type: 'openManifest', packageName: 'web', line: NaN }],
      ['an openManifest name past 214 units', { type: 'openManifest', packageName: LONG_NAME, line: 1 }],
      ['a point missing y', { type: 'positions', hash: HASH, positions: POSITIONS_WITHOUT_Y, grouping: 'flat' }],
      ['a hash that is not eight hex digits', { type: 'positions', hash: 'h', positions: POSITIONS, grouping: 'flat' }],
      ['an upper-case hash', { type: 'positions', hash: 'DC7E01EB', positions: POSITIONS, grouping: 'flat' }],
      ['a package name past 214 units', { type: 'openDetails', packageName: LONG_NAME }],
      ['a position key past 214 units', { type: 'positions', hash: HASH, positions: LONG_KEY_POSITIONS, grouping: 'flat' }],
      ['a positions list', { type: 'positions', hash: HASH, positions: [POINT], grouping: 'flat' }],
      ['null positions', { type: 'positions', hash: HASH, positions: null, grouping: 'flat' }],
      ['no positions', { type: 'positions', hash: HASH, grouping: 'flat' }],
      ['a Map of positions', { type: 'positions', hash: HASH, positions: new Map(), grouping: 'flat' }],
      [
        'a positions record with a prototype of its own',
        { type: 'positions', hash: HASH, positions: INHERITING_POSITIONS, grouping: 'flat' }
      ],
      ['a positions record past 5000 keys', positionsWith(5001)],
      ['an unknown engine', { type: 'layoutDone', ms: 1, engine: 'webgl' }],
      ['a negative layout time', { type: 'layoutDone', ms: -1, engine: 'elk' }],
      ['a layout time past 10 minutes', { type: 'layoutDone', ms: 600_001, engine: 'elk' }],
      ['an infinite layout time', { type: 'layoutDone', ms: Infinity, engine: 'elk' }],
      ['a throwing getter', THROWING_TYPE],
      ['a throwing positions getter', THROWING_POSITIONS]
    ])('WHEN parsed THEN %s is null', (_label, raw) => {
      expect(parseGraphMessage(raw)).toBeNull();
    });
  });

  describe('GIVEN a point that is not a layout coordinate', () => {
    it.each([
      ['a NaN x', { x: NaN, y: 0 }],
      ['an infinite y', { x: 0, y: Infinity }],
      ['an x below -1e7', { x: -1e7 - 1, y: 0 }],
      ['an x past 1e7', { x: 1e7 + 1, y: 0 }],
      ['a y below -1e7', { x: 0, y: -1e7 - 1 }],
      ['a y past 1e7', { x: 0, y: 1e7 + 1 }]
    ])('WHEN parsed THEN %s makes the message null', (_label, point) => {
      const positions = { a: point };

      expect(parseGraphMessage({ type: 'positions', hash: HASH, positions, grouping: 'flat' })).toBeNull();
    });
  });

  describe('GIVEN points exactly at ±1e7 on both axes', () => {
    it('WHEN parsed THEN the message passes unchanged', () => {
      const message = { type: 'positions', hash: HASH, positions: LIMIT_POSITIONS, grouping: 'flat' };

      expect(parseGraphMessage(message)).toStrictEqual(message);
    });
  });

  describe('GIVEN positions parsed from JSON with an own __proto__ key', () => {
    it('WHEN parsed THEN the __proto__ point survives as an own key', () => {
      const positions = positionsIn(parseGraphMessage(JSON.parse(PROTO_MESSAGE_JSON)));

      expect(Object.getOwnPropertyDescriptor(positions ?? {}, '__proto__')?.value).toStrictEqual({ x: 1, y: 2 });
    });

    it('WHEN parsed THEN the copy keeps the plain prototype and Object.prototype gains nothing', () => {
      const positions = positionsIn(parseGraphMessage(JSON.parse(PROTO_MESSAGE_JSON)));

      expect(Object.getPrototypeOf(positions)).toBe(Object.prototype);
      expect(Object.hasOwn(Object.prototype, 'x')).toBe(false);
    });
  });

  describe('GIVEN a layout time of 0', () => {
    it('WHEN parsed THEN it passes', () => {
      const message = { type: 'layoutDone', ms: 0, engine: 'elk' };

      expect(parseGraphMessage(message)).toStrictEqual(message);
    });
  });

  describe('GIVEN an exportImage post', () => {
    it('WHEN png is exactly 33,554,432 base64 characters THEN it passes', () => {
      const raw = { type: 'exportImage', png: 'A'.repeat(33_554_432) };

      expect(parseGraphMessage(raw)).toStrictEqual(raw);
    });

    it.each([
      ['one character over the cap', { type: 'exportImage', png: 'A'.repeat(33_554_433) }],
      ['a data: URI prefix', { type: 'exportImage', png: 'data:image/png;base64,iVBORw0KGgo=' }],
      ['a non-base64 character', { type: 'exportImage', png: 'iVBOR w0KGgo=' }],
      ['a numeric png', { type: 'exportImage', png: 7 }],
      ['no png', { type: 'exportImage' }]
    ])('WHEN it has %s THEN it is null', (_label, raw) => {
      expect(parseGraphMessage(raw)).toBeNull();
    });

    it('WHEN it carries an unknown key THEN the key is stripped', () => {
      expect(parseGraphMessage({ type: 'exportImage', png: 'AAAA', extra: 1 })).toStrictEqual({
        type: 'exportImage',
        png: 'AAAA'
      });
    });
  });

  describe('GIVEN a runTask or stopTask post', () => {
    it.each([
      [{ type: 'runTask', taskId: 'a#build', noCache: false }],
      [{ type: 'runTask', taskId: 'a#build', noCache: true }],
      [{ type: 'stopTask', taskId: 'a#build' }],
      [{ type: 'runTask', taskId: 'x'.repeat(1024), noCache: false }]
    ])('WHEN it is %j THEN it passes unchanged', (raw) => {
      const parsed = parseGraphMessage(raw);

      expect(parsed).toStrictEqual(raw);
    });

    it.each([
      ['a taskId of 1025 characters', { type: 'runTask', taskId: 'x'.repeat(1025), noCache: false }],
      ['a numeric taskId', { type: 'runTask', taskId: 7, noCache: false }],
      ['no taskId', { type: 'stopTask' }],
      ['a string noCache', { type: 'runTask', taskId: 'a#build', noCache: 'yes' }],
      ['no noCache', { type: 'runTask', taskId: 'a#build' }]
    ])('WHEN it has %s THEN it is null', (_label, raw) => {
      const parsed = parseGraphMessage(raw);

      expect(parsed).toBeNull();
    });

    it('WHEN runTask carries a packageName THEN the key is stripped', () => {
      const parsed = parseGraphMessage({ type: 'runTask', taskId: 'a#build', noCache: false, packageName: 'evil' });

      expect(parsed).toStrictEqual({ type: 'runTask', taskId: 'a#build', noCache: false });
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

  it('GIVEN an exportImage with a string png WHEN logged THEN the text is only its character count', () => {
    expect(droppedGraphText({ type: 'exportImage', png: 'data:image/png;base64,AAAA' })).toBe('exportImage with 26 chars');
  });

  it('GIVEN an exportImage with a numeric png WHEN logged THEN the text is its JSON', () => {
    expect(droppedGraphText({ type: 'exportImage', png: 7 })).toBe('{"type":"exportImage","png":7}');
  });

  it('GIVEN another type with a string png WHEN logged THEN the text is its JSON', () => {
    expect(droppedGraphText({ type: 'nope', png: 'AAAA' })).toBe('{"type":"nope","png":"AAAA"}');
  });

  it('GIVEN a throwing positions getter WHEN logged THEN the text is the unprintable marker', () => {
    expect(droppedGraphText(THROWING_POSITIONS)).toBe(UNPRINTABLE_MESSAGE);
  });
});
