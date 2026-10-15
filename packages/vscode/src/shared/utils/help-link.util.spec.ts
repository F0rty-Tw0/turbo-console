import { describe, expect, it } from 'vitest';

import { helpUrlOf } from './help-link.util.ts';

describe('FEATURE: help links', () => {
  it.each<[string, string]>([
    ['readme', 'https://github.com/F0rty-Tw0/turbo-console/tree/master/packages/vscode#readme'],
    ['bug', 'https://github.com/F0rty-Tw0/turbo-console/issues/new'],
    ['docs', 'https://turborepo.com/docs']
  ])('GIVEN the id %s WHEN its url is read THEN it is the fixed url', (id, url) => {
    const found = helpUrlOf(id);

    expect(found).toBe(url);
  });

  it.each<[string]>([['https://evil'], ['README'], [''], ['toString'], ['__proto__'], ['constructor']])(
    'GIVEN the id %j WHEN its url is read THEN it is null',
    (id) => {
      const found = helpUrlOf(id);

      expect(found).toBeNull();
    }
  );
});
