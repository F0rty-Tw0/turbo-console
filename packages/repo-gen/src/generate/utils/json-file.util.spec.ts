import { describe, expect, it } from 'vitest';

import { toJsonFile } from './json-file.util.ts';

describe('FEATURE: JSON fixture file', () => {
  describe('GIVEN a path and a nested value', () => {
    it('WHEN converted THEN the content is two-space JSON with one trailing LF', () => {
      const value = { name: 'x', list: [1] };

      const file = toJsonFile('packages/x/package.json', value);

      expect(file).toStrictEqual({ path: 'packages/x/package.json', content: '{\n  "name": "x",\n  "list": [\n    1\n  ]\n}\n' });
    });
  });
});
