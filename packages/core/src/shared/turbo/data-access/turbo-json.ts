import type { z } from 'zod';

import { TurboException } from '../../errors/common/turbo.exception.ts';
import { failedMessage, invalidOutputMessage } from '../../errors/utils/turbo-message.util.ts';
import type { TurboResult } from '../common/turbo.type.ts';

const parseOutput = <T>(stdout: string, command: string, schema: z.ZodType<T>): T => {
  try {
    const json: unknown = JSON.parse(stdout);

    return schema.parse(json);
  } catch (error) {
    throw new TurboException('invalid-output', invalidOutputMessage(command, error), { cause: error });
  }
};

/** Runs one turbo command and parses its stdout: a non-zero exit is `failed`, non-JSON or a schema break is `invalid-output`. */
export const runTurboJson = async <T>(run: () => Promise<TurboResult>, command: string, schema: z.ZodType<T>): Promise<T> => {
  const result = await run();

  if (result.exitCode !== 0) throw new TurboException('failed', failedMessage(command, result.exitCode, result.stderr));

  return parseOutput(result.stdout, command, schema);
};
