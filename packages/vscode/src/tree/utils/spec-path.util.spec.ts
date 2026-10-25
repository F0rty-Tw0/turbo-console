import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openFailedSpecText, refusedSpecText, specPathOf } from './spec-path.util.ts';

const PKG_DIR = join('/ws', 'packages', 'e2e');

describe('FEATURE: spec path', () => {
  describe('GIVEN a spec path inside the package', () => {
    it.each(['tests/a.spec.ts', 'tests/b fails.spec.ts', 'tests/nested/c.spec.ts', 'tests/..hidden/x.ts'])(
      'WHEN %j is resolved THEN it joins the package dir unchanged',
      (specPath) => {
        const path = specPathOf(PKG_DIR, specPath);

        expect(path).toBe(join(PKG_DIR, specPath));
      }
    );
  });

  describe('GIVEN a spec path that is empty, absolute, climbs out or names the package dir', () => {
    it.each(['/etc/passwd', 'C:\\Windows\\x.ts', '../x.ts', 'tests/../../x.ts', 'tests/../a.spec.ts', 'tests\\..\\x.ts', '', '.'])(
      'WHEN %j is resolved THEN it is refused',
      (specPath) => {
        const path = specPathOf(PKG_DIR, specPath);

        expect(path).toBeNull();
      }
    );
  });

  describe('GIVEN a refused spec path', () => {
    it('WHEN the refusal is worded THEN it quotes the path and says it leaves the package directory', () => {
      const text = refusedSpecText('../../etc/passwd');

      expect(text).toBe('Refused to open "../../etc/passwd": it leaves the package directory.');
    });
  });

  describe('GIVEN a spec file the editor could not open', () => {
    it('WHEN the error is worded THEN it says the spec file could not be opened and names the path', () => {
      const text = openFailedSpecText('/ws/packages/e2e/tests/a.spec.ts');

      expect(text).toBe('Could not open the spec file /ws/packages/e2e/tests/a.spec.ts.');
    });
  });
});
