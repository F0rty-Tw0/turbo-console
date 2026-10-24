import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The text of `test/fixtures/atom-results/<name>.json`: a real turbo 2.11.7 run summary, trimmed to what the readers use. */
export const readAtomFixture = (name: string): string => {
  const path = join(import.meta.dirname, '..', 'fixtures', 'atom-results', `${name}.json`);
  const text = readFileSync(path, 'utf8');

  return text;
};
