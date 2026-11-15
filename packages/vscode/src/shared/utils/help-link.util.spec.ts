import { describe, expect, it } from 'vitest';

import { helpUrlOf } from './help-link.util.ts';

describe('FEATURE: help links', () => {
  describe.each<[string, string]>([
    ['readme', 'https://github.com/F0rty-Tw0/turbo-console/tree/master/packages/vscode#readme'],
    ['bug', 'https://github.com/F0rty-Tw0/turbo-console/issues/new'],
    ['docs', 'https://turborepo.com/docs']
  ])('GIVEN the id %s', (id, url) => {
    it('WHEN its url is read THEN it is the fixed url', () => {
      const found = helpUrlOf(id);

      expect(found).toBe(url);
    });
  });

  describe.each<[string]>([['https://evil'], ['README'], [''], ['toString'], ['__proto__'], ['constructor']])(
    'GIVEN the id %j',
    (id) => {
      it('WHEN its url is read THEN it is null', () => {
        const found = helpUrlOf(id);

        expect(found).toBeNull();
      });
    }
  );
});
