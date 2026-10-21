import { describe, expect, it } from 'vitest';

import { matchesSearch } from './search.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';

const WEB_APP: GraphPackage = { name: 'Web-App', path: 'apps/Web', tags: [], taskCount: 0 };

const CONSTRUCTOR: GraphPackage = { name: 'constructor', path: 'x', tags: [], taskCount: 0 };

describe('FEATURE: matchesSearch', () => {
  describe('GIVEN the package Web-App at apps/Web', () => {
    it.each([
      ['', true],
      ['web', true],
      ['WEB-APP', true],
      ['apps/w', true],
      ['APPS/WEB', true],
      ['ps/we', true],
      ['ui', false],
      ['web app', false],
      [' ', false]
    ])('WHEN the search is %j THEN the match is %s', (search, expected) => {
      const matches = matchesSearch(WEB_APP, search);

      expect(matches).toBe(expected);
    });
  });

  describe('GIVEN a package named constructor', () => {
    it('WHEN the search is constr THEN it matches', () => {
      const matches = matchesSearch(CONSTRUCTOR, 'constr');

      expect(matches).toBe(true);
    });
  });
});
