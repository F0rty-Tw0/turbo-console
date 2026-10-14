import { TurboException } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { logTextOf } from './log-text.util.ts';
import { LOG_LINE_MAX } from '../common/text.const.ts';

describe('FEATURE: log text of an error', () => {
  describe('GIVEN a TurboException with a cause', () => {
    it('WHEN logged THEN it reads "turbo <kind>: <message>" and never shows the cause', () => {
      const error = new TurboException('failed', 'boom', { cause: new Error('secret') });

      const text = logTextOf(error);

      expect(text).toBe('turbo failed: boom');
      expect(text).not.toContain('secret');
    });
  });

  describe('GIVEN a plain Error', () => {
    it('WHEN logged THEN it is its message', () => {
      expect(logTextOf(new Error('plain'))).toBe('plain');
    });
  });

  describe('GIVEN a thrown string', () => {
    it('WHEN logged THEN it is the string', () => {
      expect(logTextOf('x')).toBe('x');
    });
  });

  describe('GIVEN a TurboException whose message holds a stderr tail', () => {
    it('WHEN logged THEN its lines are kept, each after the first indented', () => {
      const error = new TurboException('failed', 'turbo query exited 1\nerror: bad\n  at turbo.json');

      expect(logTextOf(error)).toBe('turbo failed: turbo query exited 1\n    error: bad\n      at turbo.json');
    });
  });

  describe('GIVEN a stderr line that imitates a log entry', () => {
    it('WHEN logged THEN it is indented, so it cannot start with a timestamp', () => {
      const error = new TurboException('failed', 'exited 1\n2026-10-14 02:00:00.000 [info] turbo binary verified OK');

      expect(logTextOf(error)).toBe('turbo failed: exited 1\n    2026-10-14 02:00:00.000 [info] turbo binary verified OK');
    });
  });

  describe('GIVEN a thrown object that cannot become a string', () => {
    it('WHEN logged THEN it is a placeholder instead of a throw', () => {
      expect(logTextOf(Object.create(null))).toBe('unprintable error');
    });
  });

  describe('GIVEN an Error whose message is not a string', () => {
    it('WHEN logged THEN it is the error as a string', () => {
      const error = new Error('x');

      Object.defineProperty(error, 'message', { value: 42 });

      expect(logTextOf(error)).toBe('Error: 42');
    });
  });

  describe('GIVEN an Error whose message getter throws', () => {
    it('WHEN logged THEN it is a placeholder instead of a throw', () => {
      const error = new Error('x');
      const throwing = (): never => {
        throw new Error('getter');
      };

      Object.defineProperty(error, 'message', { get: throwing });

      expect(logTextOf(error)).toBe('unprintable error');
    });
  });

  describe('GIVEN a message with a bidi control', () => {
    it('WHEN logged THEN the control is dropped', () => {
      expect(logTextOf(new Error('a\u202Eb'))).toBe('ab');
    });
  });

  describe('GIVEN a message over the log limit', () => {
    it('WHEN logged THEN it is cut to the limit', () => {
      const text = logTextOf(new Error('a'.repeat(LOG_LINE_MAX + 10)));

      expect(text).toBe(`${'a'.repeat(LOG_LINE_MAX - 1)}…`);
    });
  });

  describe('GIVEN many short lines that pass the limit once indented', () => {
    it('WHEN logged THEN the indented text is still cut to the limit', () => {
      const text = logTextOf(new Error('x\n'.repeat(LOG_LINE_MAX / 4)));

      expect(text).toHaveLength(LOG_LINE_MAX);
      expect(text.endsWith('…')).toBe(true);
    });
  });

  describe('GIVEN a message of millions of lines', () => {
    it('WHEN logged THEN only the start is read, well under a second', () => {
      const start = performance.now();

      const text = logTextOf(new Error('x\n'.repeat(20_000_000)));

      expect(text).toHaveLength(LOG_LINE_MAX);
      expect(performance.now() - start).toBeLessThan(1000);
    });
  });
});
