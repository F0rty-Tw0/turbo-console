import type { Core, EdgeSingular, NodeSingular, SingularElementArgument } from 'cytoscape';

import { packageEdges } from './graph-boxes.ts';
import { setClassesAmong } from './graph-classes.ts';
import { centreOf, syncCollapsedNodes, syncFolderLinks } from './graph-folder-elements.ts';
import { emptyDrawnLinks, labelFolderLinks, routeFolderLinks } from './graph-folder-routes.ts';
import { markFolderRuns } from './graph-run-marks.ts';
import type { Routes } from '../../bridge/common/graph-state.type.ts';
import type { FolderRouting } from '../common/folder-link-route.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { FoldersView, PackageRuns } from '../common/graph-page.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import {
  BOX_COLLAPSED_CLASS,
  BOX_STATE_CLASS_NAMES,
  COLLAPSED_ID_PREFIX,
  DIMMED_BOX_CLASS,
  FOLDER_HIDDEN_CLASS,
  FOLDER_ID_PREFIX,
  FOLDER_LINK_CLASS,
  FOLDER_NODE_CLASS,
  STATE_CLASS_NAMES
} from '../common/graph.const.ts';
import type { Paint } from '../common/paint.type.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';

type LabelOf = (folder: string) => string;

const PASS_CLASSES: string[] = [FOLDER_HIDDEN_CLASS, BOX_COLLAPSED_CLASS];

const HIDDEN_CLASSES: string[] = [FOLDER_HIDDEN_CLASS];

const isBoxNode = (node: NodeSingular): boolean => node.id().startsWith(FOLDER_ID_PREFIX);

const isInCollapsed = (name: string, scene: FolderScene): boolean => {
  const folder = scene.folderOf.get(name);

  if (folder === undefined) return false;

  return scene.collapsed.has(folder);
};

/** The pass classes by element id: each box whose folder is collapsed or has nothing drawn, and each package link with an end in a collapsed folder. */
const passClassesOf = (cy: Core, scene: FolderScene | null): Map<string, string[]> => {
  const wanted = new Map<string, string[]>();

  if (scene === null) return wanted;

  for (const folder of scene.members.keys()) {
    const isCollapsed = scene.collapsed.has(folder);
    const isShown = scene.shown.has(folder);

    if (isCollapsed) wanted.set(folderIdOf(folder), PASS_CLASSES);
    else if (!isShown) wanted.set(folderIdOf(folder), HIDDEN_CLASSES);
  }

  const touchesCollapsed = (edge: EdgeSingular): boolean => {
    const isSourceIn = isInCollapsed(edge.source().id(), scene);

    return isSourceIn || isInCollapsed(edge.target().id(), scene);
  };

  // Insurance: each such link has an end in a hidden box, which already hides it in Cytoscape.
  for (const edge of packageEdges(cy).filter(touchesCollapsed)) wanted.set(edge.id(), HIDDEN_CLASSES);

  return wanted;
};

/** Gives each element of `wanted` its pass classes and takes them from the rest, writing only the elements that change. */
const classScene = (cy: Core, wanted: ReadonlyMap<string, string[]>): void => {
  const unclass = (element: SingularElementArgument): void => {
    const isWanted = wanted.has(element.id());

    if (!isWanted) element.removeClass(PASS_CLASSES);
  };

  cy.elements(`.${FOLDER_HIDDEN_CLASS}, .${BOX_COLLAPSED_CLASS}`).forEach(unclass);

  for (const [id, classes] of wanted) setClassesAmong(cy.getElementById(id), PASS_CLASSES, classes);
};

const boxClassOf = (state: ProbeState): string => (state === 'dimmed' ? DIMMED_BOX_CLASS : state);

/** Boxes get `dimmed-box` for `dimmed`, never `.dimmed`; collapsed nodes and folder links get the four state classes. */
const paintFolders = (cy: Core, links: ReadonlyMap<string, FolderLink>, paint: Paint): void => {
  const classBox = (box: NodeSingular): void => {
    const state = paint.boxState(box.id().slice(FOLDER_ID_PREFIX.length));
    const boxClass = boxClassOf(state);

    setClassesAmong(box, BOX_STATE_CLASS_NAMES, [boxClass]);
  };
  const classCollapsed = (node: NodeSingular): void => {
    const state = paint.collapsedState(node.id().slice(COLLAPSED_ID_PREFIX.length));

    setClassesAmong(node, STATE_CLASS_NAMES, [state]);
  };
  const classLink = (edge: EdgeSingular): void => {
    const link = links.get(edge.id());

    if (link === undefined) return;

    const state = paint.folderLinkState(link);

    setClassesAmong(edge, STATE_CLASS_NAMES, [state]);
  };

  cy.batch((): void => {
    cy.nodes().filter(isBoxNode).forEach(classBox);
    cy.nodes(`.${FOLDER_NODE_CLASS}`).forEach(classCollapsed);
    cy.edges(`.${FOLDER_LINK_CLASS}`).forEach(classLink);
  });
};

/** Moves each collapsed node to the centre of all its packages, hidden ones included. */
const recentreNodes = (cy: Core, members: ReadonlyMap<string, string[]>): void => {
  const recentreNode = (node: NodeSingular): void => {
    const folder = node.id().slice(COLLAPSED_ID_PREFIX.length);
    const names = members.get(folder) ?? [];

    node.position(centreOf(cy, names));
  };

  cy.nodes(`.${FOLDER_NODE_CLASS}`).forEach(recentreNode);
};

/**
 * The folder pass. It hides with classes, never display bypasses, so `resetGhosts` (which clears edge bypasses and
 * re-runs `showOnly` on packages) cannot undo it; a package inside a hidden box is hidden by Cytoscape with its box.
 */
export const createFoldersView = (cy: Core): FoldersView => {
  const links = new Map<string, FolderLink>();
  let members: ReadonlyMap<string, string[]> = new Map();
  let routes: Routes = {};
  let drawn = emptyDrawnLinks();
  let lastPaint: Paint | null = null;
  let lastRuns: PackageRuns = new Map();

  const markRuns = (next: PackageRuns): void => {
    lastRuns = next;
    markFolderRuns(cy, members, next);
  };
  const paint = (next: Paint): void => {
    lastPaint = next;
    paintFolders(cy, links, next);
  };
  const routeLinks = (): void => {
    const routing: FolderRouting = { members, routes, drawn };

    routeFolderLinks(cy, links, routing);
  };
  const labelLinks = (): void => labelFolderLinks(cy, drawn);
  /** A toggle moves no package and changes no route, so `show` re-draws only the links it added or whose inputs changed. */
  const show = (scene: FolderScene | null, labelOf: LabelOf): void => {
    cy.batch((): void => {
      const wanted = passClassesOf(cy, scene);

      classScene(cy, wanted);
      syncCollapsedNodes(cy, scene, labelOf);
      syncFolderLinks(cy, scene, links);
      members = scene?.members ?? new Map();
      markFolderRuns(cy, members, lastRuns);
      routeLinks();
    });

    if (lastPaint !== null) paint(lastPaint);

    labelLinks();
  };
  /** Packages moved, so every link is re-drawn: a collapsed box can change while its centre stays put. */
  const recentre = (): void => {
    drawn = emptyDrawnLinks();
    cy.batch((): void => {
      recentreNodes(cy, members);
      routeLinks();
    });
    labelLinks();
  };
  const setRoutes = (next: Routes): void => {
    routes = next;
    drawn = emptyDrawnLinks();
    cy.batch(routeLinks);
    labelLinks();
  };
  const view: FoldersView = { show, paint, recentre, setRoutes, markRuns };

  return view;
};
