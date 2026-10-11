import { createHash } from 'node:crypto';

import type { FixtureFile } from '../common/fixture.type.ts';

/**
 * sha256 over the cache version and every rendered path and content, so a change to the rendered output or to the
 * versioned git step changes the key. The input is JSON-encoded, so bytes cannot shift between neighbouring fields unnoticed.
 */
export const fixtureKey = (version: number, files: FixtureFile[]): string => {
  const pairs = files.map((file) => [file.path, file.content]);
  const hash = createHash('sha256').update(JSON.stringify([version, pairs]));

  return hash.digest('hex');
};
