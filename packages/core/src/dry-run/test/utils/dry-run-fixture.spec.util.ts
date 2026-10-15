import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The parsed JSON of `test/fixtures/<name>`: real `turbo run --dry=json` stdout, not yet checked against a schema. */
export const readDryRunFixture = (name: string): unknown => {
  const path = join(import.meta.dirname, '..', 'fixtures', name);
  const json: unknown = JSON.parse(readFileSync(path, 'utf8'));

  return json;
};
