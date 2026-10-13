import { describe, expect, it } from 'vitest';

import { toTurboException } from './turbo-error.util.ts';
import { packageGraphSchema } from '../../turbo/common/package-graph.schema.ts';
import { TurboException } from '../common/turbo.exception.ts';

const parseError = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error) {
    return error;
  }
};

const abortError = (cause: unknown, stderr: string): Error => Object.assign(new Error('turbo aborted'), { name: 'AbortError', cause, stderr });

describe('FEATURE: turbo errors as TurboException', () => {
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

    it('WHEN given a bare TimeoutError DOMException THEN it is failed, timed out, with no tail', () => {
      const error = new DOMException('The operation was aborted due to timeout', 'TimeoutError');

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'failed', message: 'turbo query timed out', cause: error });
    });

    it('WHEN given an AbortError without stderr THEN the message has no tail', () => {
      const error = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

      expect(toTurboException(error, 'query').message).toBe('turbo query was aborted');
    });

    it('WHEN JSON.parse threw a SyntaxError THEN it is invalid-output, not JSON, with the original as cause', () => {
      const error = parseError('x');

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'invalid-output', message: 'turbo query printed non-JSON output', cause: error });
    });

    it('WHEN a schema threw a ZodError THEN it is invalid-output naming the issue path, with the original as cause', () => {
      const { error } = packageGraphSchema.safeParse({ data: {} });

      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'invalid-output', message: 'turbo query output failed its schema at data.packageGraph', cause: error });
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

    it('WHEN turbo was killed by a signal after writing stderr THEN the message adds the plain stderr tail', () => {
      const error = Object.assign(new Error('Command failed: turbo'), { code: null, signal: 'SIGKILL', stderr: 'FATAL: \u001B[31mgone\u001B[39m\n' });

      expect(toTurboException(error, 'query').message).toBe('turbo query failed: SIGKILL\nFATAL: gone');
    });

    it('WHEN the output passed maxBuffer THEN it is failed saying too much output was printed', () => {
      const error = Object.assign(new RangeError('stdout maxBuffer length exceeded'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' });

      expect(toTurboException(error, 'query')).toMatchObject({ kind: 'failed', message: 'turbo query printed too much output (over the output cap)' });
    });

    it('WHEN the output passed maxBuffer after turbo wrote stderr THEN the message adds the stderr tail', () => {
      const error = Object.assign(new RangeError('stdout maxBuffer length exceeded'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', stderr: 'WARN: slow\n' });

      expect(toTurboException(error, 'query').message).toBe('turbo query printed too much output (over the output cap)\nWARN: slow');
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

    it.each([
      [{ code: 5, path: '/p' }, 'io', '/p: EIO'],
      [{ code: 'EACCES', path: 123 }, 'failed', 'turbo query failed: EACCES'],
      [{ code: 'E', syscall: 7 }, 'failed', 'turbo query failed: E'],
      [{ code: 'E', path: null }, 'failed', 'turbo query failed: E']
    ])('WHEN an errno error has a non-string field (%j) THEN it is still a TurboException, %s', (fields, kind, message) => {
      const exception = toTurboException(Object.assign(new Error('x'), fields), 'query');

      expect(exception).toBeInstanceOf(TurboException);
      expect(exception).toMatchObject({ kind, message });
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
