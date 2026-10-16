import { describe, expect, it } from 'vitest';

import { scriptCopiedText } from './copy-text.util.ts';

describe('FEATURE: script copied text', () => {
  it('GIVEN a package path WHEN read THEN it says to run the command there, in literal backticks', () => {
    expect(scriptCopiedText('packages/web')).toBe('Copied. Run it in `packages/web`.');
  });

  it.each(['.', ''])('GIVEN the root package (path %j) WHEN read THEN it says to run the command in the repo root', (path) => {
    expect(scriptCopiedText(path)).toBe('Copied. Run it in the repo root.');
  });
});
