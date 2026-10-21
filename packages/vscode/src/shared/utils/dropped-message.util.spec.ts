import { describe, expect, it } from 'vitest';

import { droppedMessageText } from './dropped-message.util.ts';
import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/panel.const.ts';

describe('FEATURE: dropped message log text', () => {
  describe('GIVEN a plain object', () => {
    it('WHEN logged THEN the text is its JSON', () => {
      expect(droppedMessageText({ type: 'nope' })).toBe('{"type":"nope"}');
    });
  });

  describe('GIVEN a very long message', () => {
    it('WHEN logged THEN the text is cut to the log maximum', () => {
      const text = droppedMessageText({ type: 'x'.repeat(DROPPED_MESSAGE_MAX * 2) });

      expect(text).toHaveLength(DROPPED_MESSAGE_MAX);
    });
  });

  describe('GIVEN a value JSON cannot print', () => {
    it('WHEN the value holds a BigInt THEN the text is the unprintable marker and nothing throws', () => {
      expect(droppedMessageText({ type: 'run', taskId: 10n })).toBe(UNPRINTABLE_MESSAGE);
    });

    it('WHEN the value is circular THEN the text is the unprintable marker', () => {
      const circular: Record<string, unknown> = { type: 'run' };

      circular['self'] = circular;

      expect(droppedMessageText(circular)).toBe(UNPRINTABLE_MESSAGE);
    });

    it('WHEN the value is undefined THEN the text is the unprintable marker', () => {
      expect(droppedMessageText(undefined)).toBe(UNPRINTABLE_MESSAGE);
    });

    it('WHEN a toJSON getter throws THEN the text is the unprintable marker', () => {
      const hostile = {
        toJSON: (): never => {
          throw new Error('boom');
        }
      };

      expect(droppedMessageText(hostile)).toBe(UNPRINTABLE_MESSAGE);
    });
  });
});
