import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { runTurboJson } from './turbo-json.ts';
import { TurboException } from '../../errors/common/turbo.exception.ts';
import type { TurboResult } from '../common/turbo.type.ts';

const COMMAND = 'query packageGraph';

const countObject = z.object({ count: z.number() });

const countSchema = countObject.readonly();

const resultOf = (stdout: string, exitCode: number, stderr = ''): (() => Promise<TurboResult>) => {
  const result: TurboResult = { stdout, stderr, exitCode };

  return async (): Promise<TurboResult> => Promise.resolve(result);
};

const rejectionOf = async (run: () => Promise<TurboResult>): Promise<unknown> =>
  runTurboJson(run, COMMAND, countSchema).catch((error: unknown) => error);

describe('FEATURE: turbo JSON output', () => {
  describe('GIVEN turbo exits 0', () => {
    it('WHEN its stdout fits the schema THEN the parsed value is returned', async () => {
      const parsed = await runTurboJson(resultOf('{"count":2}', 0), COMMAND, countSchema);

      expect(parsed).toStrictEqual({ count: 2 });
    });

    it('WHEN its stdout is not JSON THEN it rejects invalid-output', async () => {
      const error = await rejectionOf(resultOf('{', 0));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'invalid-output', message: 'turbo query packageGraph printed non-JSON output' });
    });

    it('WHEN its stdout breaks the schema THEN it rejects invalid-output naming the path', async () => {
      const error = await rejectionOf(resultOf('{"count":"2"}', 0));

      expect(error).toMatchObject({ kind: 'invalid-output', message: 'turbo query packageGraph output failed its schema at count' });
    });
  });

  describe('GIVEN turbo exits non-zero', () => {
    it('WHEN its stdout is valid THEN it rejects failed with the exit code and stderr, without parsing', async () => {
      const error = await rejectionOf(resultOf('{"count":2}', 1, 'boom'));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'failed', message: 'turbo query packageGraph exited 1\nboom' });
    });
  });
});
