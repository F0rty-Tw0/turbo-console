import { describe, expect, it } from 'vitest';

import { folderOf } from './folder-group.util.ts';
import { folderLinksOf } from './folder-links.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS } from '../test/utils/folder-boards.spec.util.ts';

const A = '\u0002apps';
const P = '\u0002packages';
const ALL = BOARDS_INFOS.map((pkg) => pkg.name);

type LinkRow = [string, string, number];

const folderMapOf = (infos: GraphPackage[]): Map<string, string> => {
  const folders = new Map<string, string>();

  for (const pkg of infos) folders.set(pkg.name, folderOf(pkg.path));

  return folders;
};

const rowsOf = (infos: GraphPackage[], edges: GraphEdge[], collapsed: string[], visible: string[]): LinkRow[] => {
  const links = folderLinksOf(edges, new Set(visible), folderMapOf(infos), new Set(collapsed));

  return links.map((link): LinkRow => [link.source, link.target, link.links.length]);
};

const without = (names: string[], hidden: string): string[] => names.filter((name) => name !== hidden);

describe('FEATURE: folderLinksOf', () => {
  describe('GIVEN the boards fixture', () => {
    it.each<[string, string[], string[], LinkRow[]]>([
      ['both folders collapsed: one link, ui to utils is inside', ['apps', 'packages'], ALL, [[A, P, 3]]],
      [
        'apps collapsed: two links',
        ['apps'],
        ALL,
        [
          [A, '@acme/ui', 2],
          [A, '@acme/utils', 1]
        ]
      ],
      [
        'packages collapsed: ends merge per package',
        ['packages'],
        ALL,
        [
          ['web', P, 1],
          ['docs', P, 2]
        ]
      ],
      ['no folder collapsed: no folder links', [], ALL, []],
      ["a hidden package's links are not counted", ['apps', 'packages'], without(ALL, '@acme/ui'), [[A, P, 1]]],
      ['a link with a hidden end is dropped', ['apps'], without(ALL, 'docs'), [[A, '@acme/ui', 1]]]
    ])('GIVEN %s WHEN folder links are built THEN they are %j', (_title, collapsed, visible, expected) => {
      const rows = rowsOf(BOARDS_INFOS, BOARDS_EDGES, collapsed, visible);

      expect(rows).toStrictEqual(expected);
    });

    it('GIVEN apps collapsed WHEN folder links are built THEN a merged link lists its package edges in order', () => {
      const links = folderLinksOf(BOARDS_EDGES, new Set(ALL), folderMapOf(BOARDS_INFOS), new Set(['apps']));

      expect(links[0]?.links).toStrictEqual([
        { source: 'web', target: '@acme/ui' },
        { source: 'docs', target: '@acme/ui' }
      ]);
    });

    it('GIVEN an edge from a package no folder knows WHEN folder links are built THEN it gives no link', () => {
      const edges: GraphEdge[] = [...BOARDS_EDGES, { source: 'ghost', target: 'web' }];

      const rows = rowsOf(BOARDS_INFOS, edges, ['apps'], [...ALL, 'ghost']);

      expect(rows).toStrictEqual([
        [A, '@acme/ui', 2],
        [A, '@acme/utils', 1]
      ]);
    });
  });

  describe('GIVEN a folder named __proto__ holding a package named constructor', () => {
    it('WHEN the folder is collapsed THEN constructor to x is a link from the collapsed node', () => {
      const infos: GraphPackage[] = [
        { name: 'constructor', path: '__proto__/constructor', tags: [], taskCount: 0 },
        { name: 'x', path: 'apps/x', tags: [], taskCount: 0 }
      ];
      const edges: GraphEdge[] = [{ source: 'constructor', target: 'x' }];

      const rows = rowsOf(infos, edges, ['__proto__'], ['constructor', 'x']);

      expect(rows).toStrictEqual([['\u0002__proto__', 'x', 1]]);
    });
  });
});
