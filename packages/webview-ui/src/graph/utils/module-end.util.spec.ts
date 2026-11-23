import { describe, expect, it } from 'vitest';

import { endOf } from './module-end.util.ts';
import type { ModuleEnd } from '../../bridge/common/graph-module-sites.type.ts';

describe('FEATURE: endOf', () => {
  describe('GIVEN a scene id', () => {
    it.each<[string, ModuleEnd]>([
      ['file:src/a.ts', { kind: 'file', path: 'src/a.ts' }],
      ['dir:src/lib', { kind: 'dir', path: 'src/lib' }],
      ['pkg:@s/x', { kind: 'stub', name: '@s/x' }],
      ['file:dir:x.ts', { kind: 'file', path: 'dir:x.ts' }]
    ])('WHEN the end of %s is taken THEN it is %j', (id, end) => {
      expect(endOf(id)).toStrictEqual(end);
    });
  });
});
