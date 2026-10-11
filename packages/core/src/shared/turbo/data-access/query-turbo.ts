import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runTurbo } from './run-turbo.ts';
import type { TurboResult } from '../common/turbo.type.ts';

/**
 * Runs `turbo query <query>` in `cwd`. `variables` go to a JSON file passed with `-V <file>`, never into the query
 * text; the file's temp dir is removed afterwards, whatever turbo did.
 */
export const queryTurbo = async (query: string, cwd: string, variables?: Record<string, string>): Promise<TurboResult> => {
  if (variables === undefined) return runTurbo(['query', query], cwd);

  const varsDir = await mkdtemp(join(tmpdir(), 'turbo-console-vars-'));
  const varsFile = join(varsDir, 'variables.json');

  try {
    await writeFile(varsFile, JSON.stringify(variables));

    return await runTurbo(['query', query, '-V', varsFile], cwd);
  } finally {
    await rm(varsDir, { recursive: true, force: true, maxRetries: 5 });
  }
};
