import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyDrawnLinks, markFolderLinks } from './graph-folder-routes.ts';
import { createFoldersView } from './graph-folders-view.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { DrawnLinks } from '../common/folder-link-route.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import { groupedCyMock } from '../test/mocks/folder-boards.mock.ts';
import { containerAtMock } from '../test/mocks/folder-boxes.mock.ts';
import { THREE_POSITIONS_STUB } from '../test/stubs/folder-boards.stub.ts';
import { THREE, THREE_EDGES, THREE_GROUPS, folderLinksByIdOf, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

const labelOf = (folder: string): string => folder;

const F1 = collapsedIdOf('f1');

const F1_TO_B = folderLinkIdOf(F1, 'b');

const B_TO_F1 = folderLinkIdOf('b', F1);

/** The links f1 → b and b → f1, drawn while f1 is collapsed, whatever else collapses. */
const KEPT_LINK_IDS: string[] = [F1_TO_B, B_TO_F1];

const B_TO_F3 = folderLinkIdOf('b', collapsedIdOf('f3'));

const ALL_NAMES: string[] = THREE.map((info) => info.name);

const WITHOUT_A: string[] = ['b', 'c', 'd'];

const WITHOUT_C: string[] = ['a', 'b', 'd'];

/** `THREE_EDGES` plus c → b and b → a, so f1 → b and its reverse b → f1 each have a member per f1 package. */
const BACK_EDGES: GraphEdge[] = [...THREE_EDGES, { source: 'c', target: 'b' }, { source: 'b', target: 'a' }];

const threeSceneOf = (collapsed: string[], visible: string[] = ALL_NAMES): FolderScene => {
  return sceneOf(THREE, THREE_EDGES, { collapsed, visible });
};

/** The scene's folder links of `ids` only. */
const linksAmong = (scene: FolderScene, ids: string[]): Map<string, FolderLink> => {
  const all = folderLinksByIdOf(scene);
  const isListed = ([id]: [string, FolderLink]): boolean => ids.includes(id);
  const allEntries = [...all];
  const entries = allEntries.filter(isListed);

  return new Map(entries);
};

const backSceneOf = (visible: string[]): FolderScene => sceneOf(THREE, BACK_EDGES, { collapsed: ['f1'], visible });

describe('FEATURE: a folder toggle re-labels only the folder links it changed', () => {
  let cy: Core;
  let folders: FoldersView;
  let drawn: DrawnLinks;

  /** Marks the links of `scene` against `drawn` on a Cytoscape that can measure labels, with the earlier marks cleared. */
  const markScene = (scene: FolderScene): void => {
    vi.spyOn(cy, 'container').mockReturnValueOnce(containerAtMock(0, 0));
    markFolderLinks(cy, folderLinksByIdOf(scene), drawn);
  };

  /** Shows `scene`, then reads which of its links wait for a new label since the last mark. */
  const pendingAfter = (scene: FolderScene): string[] => {
    drawn.unlabelled.clear();
    folders.show(scene, labelOf);
    markScene(scene);
    const pending = [...drawn.unlabelled];

    return pending.map((edge) => edge.id());
  };

  beforeEach(() => {
    const scene = threeSceneOf(['f1']);

    cy = groupedCyMock(THREE_GROUPS, THREE_EDGES, THREE_POSITIONS_STUB);
    folders = createFoldersView(cy);
    drawn = emptyDrawnLinks();
    folders.show(scene, labelOf);
    markScene(scene);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cy.destroy();
  });

  describe('GIVEN f1 collapsed with its two links marked', () => {
    it('WHEN f3 collapses too THEN only its new link waits for a label', () => {
      expect(pendingAfter(threeSceneOf(['f1', 'f3']))).toStrictEqual([B_TO_F3]);
    });

    it('WHEN f1 expands and collapses again THEN its re-added links wait for a label', () => {
      folders.show(threeSceneOf([]), labelOf);

      expect(pendingAfter(threeSceneOf(['f1']))).toStrictEqual(KEPT_LINK_IDS);
    });

    it('WHEN the same scene is marked again THEN no link waits for a label', () => {
      expect(pendingAfter(threeSceneOf(['f1']))).toStrictEqual([]);
    });
  });

  describe('GIVEN f1 collapsed with c filtered out, so the reverse link b → f1 is not drawn', () => {
    beforeEach(() => {
      pendingAfter(threeSceneOf(['f1'], WITHOUT_C));
    });

    it('WHEN the filter brings c back, and with it b → f1, THEN f1 → b waits for a label again', () => {
      expect(pendingAfter(threeSceneOf(['f1']))).toContain(F1_TO_B);
    });
  });

  describe('GIVEN f1 collapsed with a member of f1 → b and of b → f1 per f1 package', () => {
    it('WHEN c is filtered out, so the count drops THEN f1 → b waits for a label again', () => {
      pendingAfter(backSceneOf(ALL_NAMES));

      expect(pendingAfter(backSceneOf(WITHOUT_C))).toContain(F1_TO_B);
    });

    it('WHEN the filter swaps a for c, so the count and the ends stay THEN no link waits for a label', () => {
      pendingAfter(backSceneOf(WITHOUT_C));

      expect(pendingAfter(backSceneOf(WITHOUT_A))).toStrictEqual([]);
    });
  });

  describe('GIVEN f1 and f3 collapsed on a Cytoscape that can measure labels', () => {
    const scene = threeSceneOf(['f1', 'f3']);

    beforeEach(() => {
      folders.show(scene, labelOf);
      vi.spyOn(cy, 'container').mockReturnValue(containerAtMock(0, 0));
    });

    it.each([
      ['f1 → b (its reverse b → f1 drawn)', [F1_TO_B], [F1_TO_B, B_TO_F1]],
      ['b → f3 (no reverse)', [B_TO_F3], [B_TO_F3]]
    ])('WHEN only %s is marked afresh THEN it and any drawn reverse wait for a new label', (_, marked, expected) => {
      const links = linksAmong(scene, marked);
      const fresh = emptyDrawnLinks();

      markFolderLinks(cy, links, fresh);
      const unlabelled = [...fresh.unlabelled];
      const pending = unlabelled.map((edge) => edge.id());

      expect(pending).toStrictEqual(expected);
    });
  });
});
