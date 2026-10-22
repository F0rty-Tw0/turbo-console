import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { nestedCentresOf } from './elk-centres.util.ts';
import { groupedElkGraphOf } from './elk-grouped-graph.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import { ELK_OPTIONS, FOLDER_PADDING_PX } from '../common/graph.const.ts';
import { BOARDS_EDGES_STUB, BOARDS_SIZE_STUB } from '../test/stubs/folder-boards.stub.ts';
import {
  allRoomsOf,
  boardsGraphOf,
  boardsSizeOf,
  childrenOf,
  hasOverlap,
  idsOf,
  layoutBoards,
  outsidersOf,
  rectOf
} from '../test/utils/folder-boards.spec.util.ts';

const PADDING = '[top=32,left=32,bottom=32,right=32]';

const groupOf = (folder: string, name: string): FolderGroup => {
  const pkg: GraphPackage = { name, path: `${folder}/${name}`, tags: [], taskCount: 0 };
  const group: FolderGroup = { folder, packages: [pkg] };

  return group;
};

describe('FEATURE: groupedElkGraphOf', () => {
  describe('GIVEN the boards groups and edges', () => {
    const graph = boardsGraphOf();
    const compounds = childrenOf(graph);

    it('WHEN built THEN the root children are the folder ids in group order', () => {
      expect(idsOf(compounds)).toStrictEqual(['\u0001apps', '\u0001packages']);
    });

    it('WHEN built THEN the apps compound holds its packages as sized leaves', () => {
      const apps = childrenOf(compounds[0] ?? graph);
      const docs = { id: 'docs', ...BOARDS_SIZE_STUB };
      const web = { id: 'web', ...BOARDS_SIZE_STUB };

      expect(apps).toStrictEqual([docs, web]);
    });

    it('WHEN built THEN the packages compound holds its three packages', () => {
      const packages = childrenOf(compounds[1] ?? graph);

      expect(idsOf(packages)).toStrictEqual(['@acme/config', '@acme/ui', '@acme/utils']);
    });

    it('WHEN built THEN the root asks ELK to lay out the children of every compound together', () => {
      expect(graph.layoutOptions?.['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    });

    it.each([0, 1])('WHEN built THEN compound %i carries every ELK option', (index) => {
      expect(compounds[index]?.layoutOptions).toMatchObject(ELK_OPTIONS);
    });

    it('WHEN built THEN the root carries every ELK option', () => {
      expect(graph.layoutOptions).toMatchObject(ELK_OPTIONS);
    });

    it('WHEN built THEN every compound has 32 px padding and the root has none', () => {
      const paddings = compounds.map((compound) => compound.layoutOptions?.['elk.padding']);

      expect(paddings).toStrictEqual([PADDING, PADDING]);
      expect(graph.layoutOptions).not.toHaveProperty('elk.padding');
    });

    it('WHEN built THEN the four edges sit at the root with edge ids and none inside a compound', () => {
      const expected = BOARDS_EDGES_STUB.map(edgeIdOf);
      const rootEdges = graph.edges ?? [];
      const rootEdgeIds = rootEdges.map((edge) => edge.id);
      const nestedEdges = compounds.flatMap((compound) => compound.edges ?? []);

      expect(rootEdgeIds).toStrictEqual(expected);
      expect(nestedEdges).toStrictEqual([]);
    });

    it('WHEN built THEN every compound carries the layering strategy', () => {
      const strategies = compounds.map((compound) => compound.layoutOptions?.['elk.layered.layering.strategy']);

      expect(strategies).toStrictEqual(['LONGEST_PATH', 'LONGEST_PATH']);
    });
  });

  describe('GIVEN the boards graph laid out by the real ELK', () => {
    it('WHEN the rooms are measured THEN every compound keeps 32 px around its children', async () => {
      const laidOut = await layoutBoards();

      const rooms = allRoomsOf(laidOut);

      expect(rooms).toHaveLength(20);
      expect(Math.min(...rooms)).toBeGreaterThanOrEqual(FOLDER_PADDING_PX);
    });

    it('WHEN the compound rects are compared THEN they are disjoint', async () => {
      const laidOut = await layoutBoards();
      const rects = childrenOf(laidOut).map(rectOf);

      expect(rects).toHaveLength(2);
      expect(hasOverlap(rects)).toBe(false);
    });

    it('WHEN centres are taken THEN there are exactly the five package keys', async () => {
      const laidOut = await layoutBoards();

      const centres = nestedCentresOf(laidOut);

      expect(Object.keys(centres).sort()).toStrictEqual(['@acme/config', '@acme/ui', '@acme/utils', 'docs', 'web']);
    });

    it('WHEN centres are taken THEN each lies inside its compound', async () => {
      const laidOut = await layoutBoards();
      const centres = nestedCentresOf(laidOut);

      const outsiders = outsidersOf(laidOut, centres);

      expect(outsiders).toStrictEqual([]);
    });
  });

  describe('GIVEN ids that look alike', () => {
    it('WHEN a package is named like a folder THEN the compound id differs from the leaf id', () => {
      const group = groupOf('apps', 'apps');

      const graph = groupedElkGraphOf([group], [], boardsSizeOf);
      const [compound] = childrenOf(graph);

      expect(compound?.id).toBe('\u0001apps');
      expect(idsOf(childrenOf(compound ?? graph))).toStrictEqual(['apps']);
    });

    it('WHEN a root folder and a real (root) folder coexist THEN their compounds are distinct', () => {
      const groups = [groupOf('', 'a'), groupOf('(root)', 'b')];

      const graph = groupedElkGraphOf(groups, [], boardsSizeOf);

      expect(idsOf(childrenOf(graph))).toStrictEqual(['\u0001', '\u0001(root)']);
    });

    it('WHEN a folder is __proto__ and a package is constructor THEN it builds', () => {
      const groups = [groupOf('__proto__', 'constructor')];

      const graph = groupedElkGraphOf(groups, [], boardsSizeOf);
      const [compound] = childrenOf(graph);

      expect(compound?.id).toBe(folderIdOf('__proto__'));
      expect(idsOf(childrenOf(compound ?? graph))).toStrictEqual(['constructor']);
    });
  });
});
