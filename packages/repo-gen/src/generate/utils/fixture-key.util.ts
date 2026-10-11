import { createHash } from 'node:crypto';

import type { FixtureFile } from '../common/fixture.type.ts';

/**
 * sha256 over every rendered path and content, so any generator change that alters output also changes the key.
 * The list is JSON-encoded as `[path, content]` pairs, so bytes cannot shift between neighbouring fields unnoticed.
 */
export const fixtureKey = (files: FixtureFile[]): string => {
  const pairs = files.map((file) => [file.path, file.content]);
  const hash = createHash('sha256').update(JSON.stringify(pairs));

  return hash.digest('hex');
};
