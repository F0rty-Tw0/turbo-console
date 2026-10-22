import type { Core, EdgeSingular, ElementDefinition, NodeSingular } from 'cytoscape';

import { packageEdges } from './graph-boxes.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import {
  BOX_COLLAPSED_CLASS,
  COLLAPSED_ID_PREFIX,
  COLLAPSED_NODE_HEIGHT,
  COLLAPSED_NODE_WIDTH,
  DIMMED_BOX_CLASS,
  FOLDER_HIDDEN_CLASS,
  FOLDER_ID_PREFIX,
  FOLDER_LINK_CLASS,
  FOLDER_NODE_CLASS,
  STATE_CLASSES
} from '../common/graph.const.ts';
import type { Paint } from '../common/paint.type.ts';
import { collapsedCentreOf } from '../utils/collapsed-centre.util.ts';
import { collapsedIdOf, folderIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';
import { pluralOf } from '../utils/plural.util.ts';

type LabelOf = (folder: string) => string;

const PASS_CLASSES = `${FOLDER_HIDDEN_CLASS} ${BOX_COLLAPSED_CLASS}`;

const BOX_STATE_CLASSES = `${STATE_CLASSES} ${DIMMED_BOX_CLASS}`;

const isBoxNode = (node: NodeSingular): boolean => node.id().startsWith(FOLDER_ID_PREFIX);

const isInCollapsed = (name: string, scene: FolderScene): boolean => {
  const folder = scene.folderOf.get(name);

  if (folder === undefined) return false;

  return scene.collapsed.has(folder);
};

/** The centre of the members' current positions as a fresh object: `collapsedCentreOf` shares its empty-folder result. */
const centreOf = (cy: Core, members: string[]): Position => {
  const positionOf = (name: string): Position => cy.getElementById(name).position();
  const { x, y } = collapsedCentreOf(members, positionOf);
  const centre: Position = { x, y };

  return centre;
};

/** Hides each box whose folder is collapsed or has nothing drawn, and each package link with an end in a collapsed folder. */
const classScene = (cy: Core, scene: FolderScene): void => {
  for (const folder of scene.members.keys()) {
    const box = cy.getElementById(folderIdOf(folder));
    const isCollapsed = scene.collapsed.has(folder);
    const isShown = scene.shown.has(folder);

    if (isCollapsed) box.addClass(PASS_CLASSES);
    else if (!isShown) box.addClass(FOLDER_HIDDEN_CLASS);
  }

  const touchesCollapsed = (edge: EdgeSingular): boolean => {
    const isSourceIn = isInCollapsed(edge.source().id(), scene);

    return isSourceIn || isInCollapsed(edge.target().id(), scene);
  };

  packageEdges(cy).filter(touchesCollapsed).addClass(FOLDER_HIDDEN_CLASS);
};

const addCollapsedNode = (cy: Core, scene: FolderScene, folder: string, labelOf: LabelOf): void => {
  const members = scene.members.get(folder) ?? [];
  const data = { id: collapsedIdOf(folder), width: COLLAPSED_NODE_WIDTH, height: COLLAPSED_NODE_HEIGHT, label: labelOf(folder) };
  const position = centreOf(cy, members);
  const definition: ElementDefinition = { data, position, classes: FOLDER_NODE_CLASS, grabbable: false };

  cy.add(definition);
};

const addFolderLink = (cy: Core, link: FolderLink): string => {
  const count = link.links.length;
  const label = pluralOf(count, 'link', 'links');
  const id = folderLinkIdOf(link.source, link.target);
  const data = { id, source: link.source, target: link.target, label, count };
  const definition: ElementDefinition = { data, classes: FOLDER_LINK_CLASS };

  cy.add(definition);

  return id;
};

const boxClassOf = (state: ProbeState): string => (state === 'dimmed' ? DIMMED_BOX_CLASS : state);

/** Boxes get `dimmed-box` for `dimmed`, never `.dimmed`; collapsed nodes and folder links get the four state classes. */
const paintFolders = (cy: Core, links: ReadonlyMap<string, FolderLink>, paint: Paint): void => {
  const classBox = (box: NodeSingular): void => {
    const state = paint.boxState(box.id().slice(FOLDER_ID_PREFIX.length));

    box.removeClass(BOX_STATE_CLASSES).addClass(boxClassOf(state));
  };
  const classCollapsed = (node: NodeSingular): void => {
    const state = paint.collapsedState(node.id().slice(COLLAPSED_ID_PREFIX.length));

    node.removeClass(STATE_CLASSES).addClass(state);
  };
  const classLink = (edge: EdgeSingular): void => {
    const link = links.get(edge.id());

    if (link !== undefined) edge.removeClass(STATE_CLASSES).addClass(paint.folderLinkState(link));
  };

  cy.batch((): void => {
    cy.nodes().filter(isBoxNode).forEach(classBox);
    cy.nodes(`.${FOLDER_NODE_CLASS}`).forEach(classCollapsed);
    cy.edges(`.${FOLDER_LINK_CLASS}`).forEach(classLink);
  });
};

/**
 * The folder pass. It hides with classes, never display bypasses, so `resetGhosts` (which clears edge bypasses and
 * re-runs `showOnly` on packages) cannot undo it; a package inside a hidden box is hidden by Cytoscape with its box.
 */
export const createFoldersView = (cy: Core): FoldersView => {
  const links = new Map<string, FolderLink>();
  let members: ReadonlyMap<string, string[]> = new Map();
  let lastPaint: Paint | null = null;

  const paint = (next: Paint): void => {
    lastPaint = next;
    paintFolders(cy, links, next);
  };
  const draw = (scene: FolderScene, labelOf: LabelOf): void => {
    classScene(cy, scene);

    for (const folder of scene.collapsed) {
      const isShown = scene.shown.has(folder);

      if (isShown) addCollapsedNode(cy, scene, folder, labelOf);
    }

    for (const link of scene.links) links.set(addFolderLink(cy, link), link);
  };
  const show = (scene: FolderScene | null, labelOf: LabelOf): void => {
    cy.batch((): void => {
      cy.remove(`.${FOLDER_NODE_CLASS}, .${FOLDER_LINK_CLASS}`);
      cy.elements(`.${FOLDER_HIDDEN_CLASS}, .${BOX_COLLAPSED_CLASS}`).removeClass(PASS_CLASSES);
      links.clear();
      members = scene?.members ?? new Map();

      if (scene !== null) draw(scene, labelOf);
    });

    if (lastPaint !== null) paint(lastPaint);
  };
  const recentreNode = (node: NodeSingular): void => {
    const folder = node.id().slice(COLLAPSED_ID_PREFIX.length);
    const names = members.get(folder) ?? [];

    node.position(centreOf(cy, names));
  };
  const recentre = (): void => {
    cy.batch((): void => void cy.nodes(`.${FOLDER_NODE_CLASS}`).forEach(recentreNode));
  };
  const view: FoldersView = { show, paint, recentre };

  return view;
};
