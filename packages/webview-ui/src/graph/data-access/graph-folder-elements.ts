import type { Core, EdgeSingular, ElementDefinition, NodeSingular } from 'cytoscape';

import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import { COLLAPSED_NODE_HEIGHT, COLLAPSED_NODE_WIDTH, FOLDER_LINK_CLASS, FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { collapsedCentreOf } from '../utils/collapsed-centre.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';
import { pluralOf } from '../utils/plural.util.ts';

type LabelOf = (folder: string) => string;

const NO_FOLDERS: string[] = [];

/** The centre of the members' current positions as a fresh object: `collapsedCentreOf` shares its empty-folder result. */
export const centreOf = (cy: Core, members: string[]): Position => {
  const positionOf = (name: string): Position => cy.getElementById(name).position();
  const { x, y } = collapsedCentreOf(members, positionOf);
  const centre: Position = { x, y };

  return centre;
};

const addCollapsedNode = (cy: Core, folder: string, label: string, position: Position): void => {
  const data = { id: collapsedIdOf(folder), width: COLLAPSED_NODE_WIDTH, height: COLLAPSED_NODE_HEIGHT, label };
  const definition: ElementDefinition = { data, position, classes: FOLDER_NODE_CLASS, grabbable: false };

  cy.add(definition);
};

/** Adds the folder's collapsed node, or gives the drawn one the label and centre it lacks. */
const placeCollapsedNode = (cy: Core, scene: FolderScene, folder: string, labelOf: LabelOf): void => {
  const node = cy.getElementById(collapsedIdOf(folder));
  const members = scene.members.get(folder) ?? [];
  const label = labelOf(folder);
  const centre = centreOf(cy, members);

  const isNew = node.empty();

  if (isNew) {
    addCollapsedNode(cy, folder, label, centre);

    return;
  }

  const { x, y } = node.position();
  const drawnLabel: unknown = node.data('label');
  const isLabelled = drawnLabel === label;
  const isCentred = x === centre.x && y === centre.y;

  if (!isLabelled) node.data('label', label);

  if (!isCentred) node.position(centre);
};

const addFolderLink = (cy: Core, id: string, link: FolderLink, label: string): void => {
  const data = { id, source: link.source, target: link.target, label, count: link.links.length };
  const definition: ElementDefinition = { data, classes: FOLDER_LINK_CLASS };

  cy.add(definition);
};

/** Adds the folder link, or gives the drawn one the count and label it lacks. */
const placeFolderLink = (cy: Core, id: string, link: FolderLink): void => {
  const edge = cy.getElementById(id);
  const count = link.links.length;
  const label = pluralOf(count, 'link', 'links');

  const isNew = edge.empty();

  if (isNew) {
    addFolderLink(cy, id, link, label);

    return;
  }

  const drawnCount: unknown = edge.data('count');
  const isCounted = drawnCount === count;

  if (!isCounted) edge.data({ label, count });
};

/** The collapsed folders the scene draws, in collapse order: a collapsed folder with nothing drawn has no node. */
const drawnCollapsedOf = (scene: FolderScene | null): string[] => {
  if (scene === null) return NO_FOLDERS;

  const collapsed = [...scene.collapsed];
  const isShown = (folder: string): boolean => scene.shown.has(folder);

  return collapsed.filter(isShown);
};

/**
 * Brings the collapsed nodes to the scene: removes the ones it lacks, with their links, adds the new ones and relabels or
 * re-centres the kept ones. A kept node is not added again, so Cytoscape does not restyle it; it also keeps its place in
 * Cytoscape's draw order, so that order follows the toggle history rather than the scene.
 */
export const syncCollapsedNodes = (cy: Core, scene: FolderScene | null, labelOf: LabelOf): void => {
  const folders = drawnCollapsedOf(scene);
  const ids = new Set(folders.map(collapsedIdOf));
  const isStale = (node: NodeSingular): boolean => !ids.has(node.id());

  cy.remove(cy.nodes(`.${FOLDER_NODE_CLASS}`).filter(isStale));

  if (scene === null) return;

  for (const folder of folders) placeCollapsedNode(cy, scene, folder, labelOf);
};

/**
 * Brings the folder links to `scene` and refills `links` by id: removes the links it lacks, adds the new ones and
 * recounts the kept ones. Call after `syncCollapsedNodes`, so each link's ends are drawn. New links draw above kept ones,
 * whatever their place in `scene.links`.
 */
export const syncFolderLinks = (cy: Core, scene: FolderScene | null, links: Map<string, FolderLink>): void => {
  const sceneLinks = scene?.links ?? [];
  const isStale = (edge: EdgeSingular): boolean => !links.has(edge.id());

  links.clear();

  for (const link of sceneLinks) links.set(folderLinkIdOf(link.source, link.target), link);

  cy.remove(cy.edges(`.${FOLDER_LINK_CLASS}`).filter(isStale));

  for (const [id, link] of links) placeFolderLink(cy, id, link);
};
