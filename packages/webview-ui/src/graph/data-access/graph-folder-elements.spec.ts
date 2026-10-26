import type { Core, EventObject } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncCollapsedNodes, syncFolderLinks } from './graph-folder-elements.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

const UI = '@acme/ui';

const UTILS = '@acme/utils';

const APPS_NODE = collapsedIdOf('apps');

const PACKAGES_NODE = collapsedIdOf('packages');

const APPS_TO_UI = folderLinkIdOf(APPS_NODE, UI);

const APPS_TO_PACKAGES = folderLinkIdOf(APPS_NODE, PACKAGES_NODE);

const WITHOUT_DOCS = ['web', '@acme/config', UI, UTILS];

const labelOf = (folder: string): string => `L:${folder}`;

const otherLabelOf = (folder: string): string => `M:${folder}`;

describe('FEATURE: syncCollapsedNodes and syncFolderLinks', () => {
  let cy: Core;
  let links: Map<string, FolderLink>;
  let events: string[];

  const sync = (scene: FolderScene | null, label = labelOf): void => {
    syncCollapsedNodes(cy, scene, label);
    syncFolderLinks(cy, scene, links);
  };
  const record = (event: EventObject): void => {
    events.push(event.type);
  };
  const folderIdsOf = (): string[] => cy.elements('.folder-node, .folder-link').map((element): string => element.id());

  beforeEach(() => {
    cy = boardsCyMock();
    links = new Map();
    events = [];
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN apps is collapsed and drawn', () => {
    beforeEach(() => {
      sync(boardsSceneOf(['apps']));
      cy.on('add remove data position', record);
    });

    it('WHEN the same scene is synced again THEN no element is added, removed, relabelled or moved', () => {
      sync(boardsSceneOf(['apps']));

      expect(events).toStrictEqual([]);
    });

    it('WHEN packages is collapsed too THEN the packages node and its link are added and the two links into packages go', () => {
      sync(boardsSceneOf(['apps', 'packages']));

      const expected = [APPS_NODE, PACKAGES_NODE, APPS_TO_PACKAGES];

      expect(folderIdsOf().toSorted()).toStrictEqual(expected.toSorted());
    });

    it('WHEN packages is collapsed too THEN the kept apps node is neither removed nor added again', () => {
      sync(boardsSceneOf(['apps', 'packages']));

      expect(events.toSorted()).toStrictEqual(['add', 'add', 'remove', 'remove']);
    });

    it('WHEN nothing is collapsed THEN the collapsed node and its folder links are removed', () => {
      sync(boardsSceneOf([]));

      expect(cy.elements('.folder-node, .folder-link')).toHaveLength(0);
    });

    it('WHEN the scene is null THEN no collapsed node or folder link is left and the links map is empty', () => {
      sync(null);

      expect([cy.elements('.folder-node, .folder-link').length, links.size]).toStrictEqual([0, 0]);
    });

    it('WHEN the label changes THEN the kept node takes the new label', () => {
      sync(boardsSceneOf(['apps']), otherLabelOf);

      expect(cy.getElementById(APPS_NODE).data('label')).toBe('M:apps');
    });

    it('WHEN docs has moved THEN the kept node moves to the new centre of docs and web', () => {
      cy.getElementById('docs').position({ x: 0, y: 200 });

      sync(boardsSceneOf(['apps']));

      expect(cy.getElementById(APPS_NODE).position()).toStrictEqual({ x: 60, y: 100 });
    });

    it('WHEN docs is hidden THEN the kept apps to ui link counts 1 link', () => {
      sync(boardsSceneOf(['apps'], WITHOUT_DOCS));

      const link = cy.getElementById(APPS_TO_UI);

      expect([link.data('label'), link.data('count')]).toStrictEqual(['1 link', 1]);
    });

    it('WHEN packages is collapsed too THEN the links map holds exactly the drawn folder links', () => {
      sync(boardsSceneOf(['apps', 'packages']));

      const ids = cy.edges('.folder-link').map((edge): string => edge.id());
      const keys = links.keys();

      expect([...keys]).toStrictEqual(ids);
    });
  });
});
