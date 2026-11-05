import { EventEmitter } from 'node:events';
import { watch } from 'node:fs';
import type * as nodeFs from 'node:fs';
import { tmpdir } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { editorRunLogPorts } from './run-log-fs.ts';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof nodeFs>();
  const mocked = { ...actual, watch: vi.fn(actual.watch) };

  return mocked;
});

describe("FEATURE: the log tails' folder watcher (spec D5)", () => {
  const ports = editorRunLogPorts(vi.fn());

  describe('GIVEN a watched folder whose watcher fails after it started', () => {
    it('WHEN it emits an error THEN onError gets that error and nothing throws', () => {
      const onError = vi.fn();
      const failure = new Error('watch broke');
      const watcher = ports.watch(tmpdir(), vi.fn(), onError);
      const started: unknown = vi.mocked(watch).mock.results[0]?.value;
      const fail = (): void => {
        if (started instanceof EventEmitter) started.emit('error', failure);
      };

      expect(started).toBeInstanceOf(EventEmitter);
      expect(fail).not.toThrow();
      watcher.close();
      expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    });
  });
});
