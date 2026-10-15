import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runTurbo } from './run-turbo.ts';
import type { QueryTurboOptions, TurboResult } from '../common/turbo.type.ts';

/**
 * Runs `turbo query <query>` in `cwd` with the turbo binary at `binaryPath`. `variables` go to a JSON file passed with
 * `-V <file>`, never into the query text; the file's temp dir is removed afterwards, whatever turbo did.
 */
export const queryTurbo = async (
  binaryPath: string,
  query: string,
  cwd: string,
  options: QueryTurboOptions = {}
): Promise<TurboResult> => {
  const { variables, ...runOptions } = options;

  if (variables === undefined) return runTurbo(binaryPath, ['query', query], cwd, runOptions);

  const varsDir = await mkdtemp(join(tmpdir(), 'turbo-console-vars-'));
  const varsFile = join(varsDir, 'variables.json');

  try {
    await writeFile(varsFile, JSON.stringify(variables));

    return await runTurbo(binaryPath, ['query', query, '-V', varsFile], cwd, runOptions);
  } finally {
    await rm(varsDir, { recursive: true, force: true, maxRetries: 5 });
  }
};
