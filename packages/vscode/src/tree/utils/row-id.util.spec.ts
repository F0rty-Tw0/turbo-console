import { describe, expect, it } from 'vitest';

import { rowIdOf } from './row-id.util.ts';

describe('FEATURE: tree row ids', () => {
  describe('GIVEN a root row', () => {
    it('WHEN identified THEN the id is root: and the root path alone', () => {
      expect(rowIdOf('root', '/ws', '/ws')).toBe('root:/ws');
    });
  });

  describe.each(['dir', 'pkg', 'task', 'msg'] as const)('GIVEN a %s row', (kind) => {
    it('WHEN identified THEN the id is the kind, the root, a NUL and the key', () => {
      expect(rowIdOf(kind, '/ws', 'a')).toBe(`${kind}:/ws\0a`);
    });
  });

  describe('GIVEN a package and a directory with the same name', () => {
    it('WHEN identified THEN the ids differ', () => {
      expect(rowIdOf('pkg', '/ws', 'a')).not.toBe(rowIdOf('dir', '/ws', 'a'));
    });
  });
});
