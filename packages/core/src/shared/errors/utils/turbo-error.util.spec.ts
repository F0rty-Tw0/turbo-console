import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  failedMessage,
  invalidOutputMessage,
  ioMessage,
  toTurboException,
  versionUnsupportedMessage
} from './turbo-error.util.ts';
import { packageGraphSchema } from '../../turbo/common/package-graph.schema.ts';
import { SUPPORTED_TURBO_RANGE } from '../../turbo/common/turbo-version.const.ts';
import { TurboException } from '../common/turbo.exception.ts';

const numberedLines = (count: number): string[] => Array.from({ length: count }, (_, index) => `line ${index + 1}`);

const parseError = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error) {
    return error;
  }
};

const abortError = (cause: unknown, stderr: string): Error => Object.assign(new Error('turbo aborted'), { name: 'AbortError', cause, stderr });

describe('FEATURE: turbo error messages', () => {
  describe('GIVEN failedMessage', () => {
    it('WHEN turbo exited 3 THEN it names the exit code, then the stderr tail', () => {
      expect(failedMessage('query', 3, 'bad\n')).toBe('turbo query exited 3\nbad');
    });

    it('WHEN turbo timed out THEN it says so, then the stderr tail', () => {
      expect(failedMessage('query', 'timeout', 'slow\n')).toBe('turbo query timed out\nslow');
    });

    it('WHEN turbo was aborted THEN it says so, then the stderr tail', () => {
      expect(failedMessage('query', 'aborted', 'stopped\n')).toBe('turbo query was aborted\nstopped');
    });

    it('WHEN stderr has 25 lines THEN the message holds the head and lines 6 to 25', () => {
      const lines = numberedLines(25);
      const lastTwenty = lines.slice(5);
      const expected = `turbo query exited 1\n${lastTwenty.join('\n')}`;

      const message = failedMessage('query', 1, `${lines.join('\n')}\n`);

      expect(message).toBe(expected);
    });

    it('WHEN stderr is empty THEN the message has no trailing newline', () => {
      expect(failedMessage('query', 3, '')).toBe('turbo query exited 3');
    });
  });

  describe('GIVEN invalidOutputMessage', () => {
    it('WHEN JSON.parse failed THEN it says the output is not JSON', () => {
      const error = parseError('x');

      expect(invalidOutputMessage('query', error)).toBe('turbo query printed non-JSON output');
    });

    it('WHEN reading the output failed otherwise THEN it says the output could not be read', () => {
      expect(invalidOutputMessage('query', new Error('read failed'))).toBe('turbo query output could not be read');
    });

    it('WHEN an issue path holds repo text THEN each segment is plain and at most 200 characters', () => {
      const longKey = 'k'.repeat(300);
      const output = { 'evil\n\u001B[2Jkey': 'x', [longKey]: 'y' };
      const expected = `turbo query output failed its schema at evilkey, ${'k'.repeat(200)}`;

      const result = z.record(z.string(), z.number()).safeParse(output);

      expect(invalidOutputMessage('query', result.error)).toBe(expected);
    });

    it('WHEN the package graph schema failed THEN it names the issue path, not the input', () => {
      const result = packageGraphSchema.safeParse({ data: {} });

      const message = invalidOutputMessage('query', result.error);

      expect(message).toBe('turbo query output failed its schema at data.packageGraph');
    });

    it('WHEN the root value failed THEN it names the path (root)', () => {
      const result = z.string().safeParse(1);

      expect(invalidOutputMessage('query', result.error)).toBe('turbo query output failed its schema at (root)');
    });

    it('WHEN more than 10 issues exist THEN it names the first 10', () => {
      const result = z.array(z.string()).safeParse(numberedLines(12).map((_, index) => index));

      const message = invalidOutputMessage('query', result.error);

      expect(message).toBe('turbo query output failed its schema at 0, 1, 2, 3, 4, 5, 6, 7, 8, 9');
    });
  });

  describe('GIVEN ioMessage and versionUnsupportedMessage', () => {
    it('WHEN a path and a code are given THEN ioMessage joins them', () => {
      expect(ioMessage('/p', 'EACCES')).toBe('/p: EACCES');
    });

    it('WHEN the code is undefined THEN ioMessage uses EIO', () => {
      expect(ioMessage('/p', undefined)).toBe('/p: EIO');
    });

    it('WHEN an unsupported version is given THEN the message names it and the supported range', () => {
      const { min, maxExclusive } = SUPPORTED_TURBO_RANGE;

      const message = versionUnsupportedMessage('2.12.0', SUPPORTED_TURBO_RANGE);

      expect(message).toBe(`turbo 2.12.0 is not supported; need >=${min} <${maxExclusive}`);
    });
  });

  describe('GIVEN toTurboException', () => {
    it('WHEN given a TurboException THEN it returns the same instance', () => {
      const original = new TurboException('io', '/p: EACCES');

      expect(toTurboException(original, 'query')).toBe(original);
    });

    it('WHEN given a timeout AbortError with stderr THEN it is failed, timed out, with the stderr tail', () => {
      const error = abortError(new DOMException('timed out', 'TimeoutError'), 'hung\n');

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'failed', message: 'turbo query timed out\nhung', cause: error });
    });

    it("WHEN given an AbortError caused by the caller's reason THEN it is failed, aborted, with the stderr tail", () => {
      const error = abortError(new Error('caller stopped'), 'partial\n');

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'failed', message: 'turbo query was aborted\npartial' });
    });

    it('WHEN given an AbortError without stderr THEN the message has no tail', () => {
      const error = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

      expect(toTurboException(error, 'query').message).toBe('turbo query was aborted');
    });

    it.each(['ENOENT', 'EACCES', 'ENOTDIR'])('WHEN the spawn failed with %s THEN it is not-found, naming the binary path', (code) => {
      const error = Object.assign(new Error(`spawn /bin/turbo ${code}`), { code, syscall: 'spawn /bin/turbo', path: '/bin/turbo' });

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'not-found', message: `turbo binary not runnable: /bin/turbo: ${code}`, cause: error });
    });

    it('WHEN a spawn error has no path THEN not-found names turbo instead', () => {
      const error = Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT', syscall: 'spawn' });

      expect(toTurboException(error, 'query').message).toBe('turbo binary not runnable: turbo: ENOENT');
    });

    it('WHEN the spawn failed with another code THEN it is failed with that code, never io', () => {
      const error = Object.assign(new Error('spawn /bin/turbo EPERM'), { code: 'EPERM', syscall: 'spawn /bin/turbo', path: '/bin/turbo' });

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'failed', message: 'turbo query failed: EPERM', cause: error });
    });

    it('WHEN an errno error with a path has no code THEN it is io with EIO', () => {
      const error = Object.assign(new Error('read failed'), { code: undefined, syscall: 'read', path: '/repo/turbo.json' });

      expect(toTurboException(error, 'query').message).toBe('/repo/turbo.json: EIO');
    });

    it('WHEN turbo was killed by a signal THEN it is failed naming the signal', () => {
      const error = Object.assign(new Error('Command failed: turbo\nsecret stderr'), { code: null, signal: 'SIGSEGV' });

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'failed', message: 'turbo query failed: SIGSEGV', cause: error });
    });

    it('WHEN the output passed maxBuffer THEN it is failed naming the code', () => {
      const error = Object.assign(new RangeError('stdout maxBuffer length exceeded'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' });

      expect(toTurboException(error, 'query').message).toBe('turbo query failed: ERR_CHILD_PROCESS_STDIO_MAXBUFFER');
    });

    it('WHEN a file read failed with a path THEN it is io with the path and code', () => {
      const error = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES', syscall: 'open', path: '/repo/turbo.json' });

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'io', message: '/repo/turbo.json: EACCES', cause: error });
    });

    it('WHEN an errno error has no path THEN it is failed naming the code, with the original as cause', () => {
      const error = Object.assign(new Error('write EPIPE'), { code: 'EPIPE', syscall: 'write' });

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'failed', message: 'turbo query failed: EPIPE', cause: error });
    });

    it('WHEN given anything else THEN it is failed with the original as cause', () => {
      const error = new RangeError('maxBuffer length exceeded');

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'failed', message: 'turbo query failed', cause: error });
    });

    it('WHEN given a non-Error THEN the result is a failed TurboException named TurboException, caused by it', () => {
      const exception = toTurboException('boom', 'query');

      expect(exception).toBeInstanceOf(TurboException);
      expect(exception).toMatchObject({ name: 'TurboException', kind: 'failed', message: 'turbo query failed', cause: 'boom' });
    });
  });
});
