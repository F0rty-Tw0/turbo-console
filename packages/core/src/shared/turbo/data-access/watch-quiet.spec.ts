import { PassThrough } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { watchQuiet } from './watch-quiet.ts';

const QUIET_MS = 100;

describe('FEATURE: quiet watch over output streams', () => {
  let stdout: PassThrough;
  let stderr: PassThrough;
  let onQuiet = vi.fn<() => void>();
  let stop = (): void => undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    stdout = new PassThrough();
    stderr = new PassThrough();
    onQuiet = vi.fn<() => void>();
    stop = watchQuiet([stdout, null, stderr], QUIET_MS, onQuiet);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  describe('GIVEN no chunk yet', () => {
    it('WHEN far more than the quiet time passes THEN onQuiet is not called', () => {
      vi.advanceTimersByTime(QUIET_MS * 10);

      expect(onQuiet).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a stdout chunk', () => {
    it('WHEN the quiet time passes THEN onQuiet is called once', () => {
      stdout.write('x');
      vi.advanceTimersByTime(QUIET_MS);

      expect(onQuiet).toHaveBeenCalledOnce();
    });

    it('WHEN a stderr chunk follows just before the quiet time THEN the wait restarts from it', () => {
      stdout.write('x');
      vi.advanceTimersByTime(QUIET_MS - 10);
      stderr.write('y');
      vi.advanceTimersByTime(QUIET_MS - 10);

      expect(onQuiet).not.toHaveBeenCalled();
    });

    it('WHEN a chunk arrives after onQuiet ran THEN onQuiet runs again after the next quiet time', () => {
      stdout.write('x');
      vi.advanceTimersByTime(QUIET_MS);
      stdout.write('y');
      vi.advanceTimersByTime(QUIET_MS);

      expect(onQuiet).toHaveBeenCalledTimes(2);
    });

    it('WHEN stop runs before the quiet time THEN onQuiet is not called', () => {
      stdout.write('x');
      stop();
      vi.advanceTimersByTime(QUIET_MS);

      expect(onQuiet).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a stopped watch', () => {
    it('WHEN a chunk arrives THEN onQuiet is not called', () => {
      stop();
      stdout.write('x');
      vi.advanceTimersByTime(QUIET_MS);

      expect(onQuiet).not.toHaveBeenCalled();
    });
  });
});
