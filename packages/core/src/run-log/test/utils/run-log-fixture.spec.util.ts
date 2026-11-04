import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The bytes of `test/fixtures/turbo-2.11.7/<name>.json`: a real structured log captured from turbo 2.11.7. */
export const runLogFixtureBytes = async (name: string): Promise<Uint8Array> => {
  const path = join(import.meta.dirname, '..', 'fixtures', 'turbo-2.11.7', `${name}.json`);
  const bytes = await readFile(path);

  return bytes;
};
