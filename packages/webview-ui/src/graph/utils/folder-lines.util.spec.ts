import { describe, expect, it } from 'vitest';

import { folderLinesOf } from './folder-lines.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';

const pkgOf = (name: string, path: string): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return pkg;
};

const edge = (source: string, target: string): GraphEdge => {
  const link: GraphEdge = { source, target };

  return link;
};

const CORE: GraphPackage[] = [pkgOf('k1', 'core/k1'), pkgOf('k2', 'core/k2'), pkgOf('k3', 'core/k3')];

const outsideOf = (folder: string): GraphPackage => pkgOf(`${folder}1`, `${folder}/${folder}1`);

const FIVE_FOLDER_KEYS = ['a', 'b', 'c', 'd', 'e'];

const FIVE_FOLDERS: GraphPackage[] = FIVE_FOLDER_KEYS.map(outsideOf);

describe('FEATURE: folderLinesOf', () => {
  describe('GIVEN a focused folder core and links to five other folders', () => {
    const infos = [...CORE, ...FIVE_FOLDERS];
    const edges = [
      edge('k1', 'a1'),
      edge('k2', 'a1'),
      edge('k3', 'a1'),
      edge('k1', 'b1'),
      edge('k2', 'b1'),
      edge('b1', 'k3'),
      edge('k1', 'c1'),
      edge('k2', 'c1'),
      edge('k3', 'd1'),
      edge('e1', 'k3')
    ];

    it('WHEN the lines are built THEN they are by count, then title, with the cap and the rest counted', () => {
      const lines = folderLinesOf('core', infos, edges);

      expect(lines).toStrictEqual([
        '3 links with a not shown',
        '3 links with b not shown',
        '2 links with c not shown',
        'and 2 more folders'
      ]);
    });
  });

  describe('GIVEN one link to each of 4, 3 or 1 other folders', () => {
    it.each([
      {
        folders: ['a', 'b', 'c', 'd'],
        expected: ['1 link with a not shown', '1 link with b not shown', '1 link with c not shown', 'and 1 more folder']
      },
      { folders: ['a', 'b', 'c'], expected: ['1 link with a not shown', '1 link with b not shown', '1 link with c not shown'] },
      { folders: ['a'], expected: ['1 link with a not shown'] }
    ])('WHEN there are $folders THEN the lines are $expected', ({ folders, expected }) => {
      const others = folders.map(outsideOf);
      const edges = folders.map((folder) => edge('k1', `${folder}1`));

      const lines = folderLinesOf('core', [...CORE, ...others], edges);

      expect(lines).toStrictEqual(expected);
    });
  });

  describe('GIVEN links that do not count', () => {
    it.each([
      { title: 'no outside link', edges: [] as GraphEdge[] },
      { title: 'a link inside the focused folder', edges: [edge('k1', 'k2')] },
      { title: 'a link to an unknown package', edges: [edge('k1', 'ghost')] },
      { title: 'a link between two other folders', edges: [edge('a1', 'b1')] }
    ])('WHEN there is $title THEN there are no lines', ({ edges }) => {
      const infos = [...CORE, outsideOf('a'), outsideOf('b')];

      const lines = folderLinesOf('core', infos, edges);

      expect(lines).toStrictEqual([]);
    });
  });

  describe('GIVEN titles that differ between code unit and locale order', () => {
    it('WHEN the counts tie THEN a capital letter sorts before a lower-case one', () => {
      const infos = [...CORE, outsideOf('a'), outsideOf('B')];
      const edges = [edge('k1', 'a1'), edge('k1', 'B1')];

      const lines = folderLinesOf('core', infos, edges);

      expect(lines).toStrictEqual(['1 link with B not shown', '1 link with a not shown']);
    });
  });

  describe('GIVEN root packages and a real (root) folder', () => {
    it('WHEN both link to the focused folder THEN their titles differ', () => {
      const infos = [...CORE, pkgOf('top', 'top'), pkgOf('named', '(root)/named')];
      const edges = [edge('k1', 'top'), edge('k1', 'named')];

      const lines = folderLinesOf('core', infos, edges);

      expect(lines).toStrictEqual(['1 link with (root) not shown', '1 link with ./(root) not shown']);
    });
  });

  describe('GIVEN a focused folder named like an Object member', () => {
    it('WHEN a package named constructor links to it THEN the line counts it', () => {
      const infos = [pkgOf('a', '__proto__/a'), pkgOf('constructor', 'x/constructor')];
      const edges = [edge('a', 'constructor')];

      const lines = folderLinesOf('__proto__', infos, edges);

      expect(lines).toStrictEqual(['1 link with x not shown']);
    });
  });
});
