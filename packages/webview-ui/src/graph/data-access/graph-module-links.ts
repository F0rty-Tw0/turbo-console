import type { ElementDefinition } from 'cytoscape';

import { MODULE_LAZY_CLASS, MODULE_LINK_CLASS, MODULE_TYPE_CLASS } from '../common/graph-module.const.ts';
import type { ModuleSceneLink } from '../common/module-scene.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const SOLID_LINK_CLASSES = MODULE_LINK_CLASS;

const LAZY_LINK_CLASSES = `${MODULE_LINK_CLASS} ${MODULE_LAZY_CLASS}`;

const TYPE_LINK_CLASSES = `${MODULE_LINK_CLASS} ${MODULE_TYPE_CLASS}`;

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

/** A module link, drawn as the plain bezier a package edge draws; its count label sits on the line's midpoint. */
export const moduleLinkDefinitionOf = (link: ModuleSceneLink): ElementDefinition => {
  const data = { id: edgeIdOf(link), source: link.source, target: link.target, count: countOf(link) };
  const definition: ElementDefinition = { data, classes: linkClassesOf(link) };

  return definition;
};
