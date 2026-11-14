import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..');

describe('FEATURE: the packaged LICENSE', () => {
  describe('GIVEN the repo LICENSE and the extension LICENSE', () => {
    it('WHEN both are read THEN they are byte for byte the same', () => {
      const packaged = readFileSync(resolve(PACKAGE_ROOT, 'LICENSE'));
      const root = readFileSync(resolve(REPO_ROOT, 'LICENSE'));

      expect(packaged.equals(root)).toBe(true);
    });
  });
});
