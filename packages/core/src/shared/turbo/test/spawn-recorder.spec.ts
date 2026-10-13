import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { recordingExecFile } from './utils/spawn-recorder.spec.util.ts';

const PRINT_X = ['-e', 'process.stdout.write("x")'];

describe('FEATURE: spawn recorder for execFile', () => {
  describe('GIVEN execFile wrapped with an empty file list', () => {
    it('WHEN node is run through the callback form THEN its path is recorded and the callback gets its stdout', async () => {
      const files: string[] = [];
      const wrapper = recordingExecFile(execFile, files);
      const { promise, resolve, reject } = Promise.withResolvers<string>();

      const onDone = (error: Error | null, stdout: string): void => {
        if (error === null) resolve(stdout);
        else reject(error);
      };

      wrapper(process.execPath, PRINT_X, onDone);

      await expect(promise).resolves.toBe('x');
      expect(files).toStrictEqual([process.execPath]);
    });

    it('WHEN the wrapper is promisified THEN it still resolves stdout and stderr', async () => {
      const wrapper = recordingExecFile(execFile, []);

      const result = await promisify(wrapper)(process.execPath, PRINT_X);

      expect(result).toMatchObject({ stdout: 'x', stderr: '' });
    });
  });
});
