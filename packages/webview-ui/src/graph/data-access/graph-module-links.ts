import type { ElementDefinition, EventObjectNode } from 'cytoscape';

import { MODULE_LAZY_CLASS, MODULE_LINK_CLASS, MODULE_ROUTED_CLASS, MODULE_TYPE_CLASS } from '../common/graph-module.const.ts';
import type { ModuleDrawing } from '../common/module-canvas.type.ts';
import type { ModuleSceneLink } from '../common/module-scene.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { moduleLinkSegmentsOf } from '../utils/module-route.util.ts';

const SOLID_LINK_CLASSES = MODULE_LINK_CLASS;

const LAZY_LINK_CLASSES = `${MODULE_LINK_CLASS} ${MODULE_LAZY_CLASS}`;

const TYPE_LINK_CLASSES = `${MODULE_LINK_CLASS} ${MODULE_TYPE_CLASS}`;

const ROUTED_SELECTOR = `.${MODULE_ROUTED_CLASS}`;

/** Solid while the link carries a static import; else dotted with a lazy one, else dashed (types only). */
const linkClassesOf = (link: ModuleSceneLink): string => {
  if (link.statics > 0) return SOLID_LINK_CLASSES;

  if (link.lazies > 0) return LAZY_LINK_CLASSES;

  return TYPE_LINK_CLASSES;
};

/** The link's import count as its label, none for a single import. */
const countOf = (link: ModuleSceneLink): string => {
  const total = link.statics + link.types + link.lazies;

  if (total > 1) return String(total);

  return '';
};

/**
 * A module link, drawn on its ELK route (`MODULE_ROUTED_CLASS` and the segment data) when the layout routed it, else as
 * the plain line every other mode draws. Its count label sits on the drawn line's midpoint, so a routed label follows its route.
 */
export const moduleLinkDefinitionOf = (link: ModuleSceneLink, drawing: ModuleDrawing): ElementDefinition => {
  const segments = moduleLinkSegmentsOf(link, drawing.routes, drawing.positions);
  const own = { id: edgeIdOf(link), source: link.source, target: link.target, count: countOf(link) };
  const classes = linkClassesOf(link);
  const plain: ElementDefinition = { data: own, classes };

  if (segments === null) return plain;

  const data = { ...own, ...segments };
  const routed: ElementDefinition = { data, classes: `${classes} ${MODULE_ROUTED_CLASS}` };

  return routed;
};

/**
 * The links of a dragged card leave their routes and draw plain: each route was laid out for where the cards were. The
 * next draw routes them again. Cytoscape emits `drag` on every element it moves, a dragged box's descendants included,
 * so each handles only its own links and a frame costs the moved links, not a walk of the box per descendant.
 */
export const unrouteDragged = (event: EventObjectNode): void => {
  const routed = event.target.connectedEdges(ROUTED_SELECTOR);

  routed.removeClass(MODULE_ROUTED_CLASS);
};
