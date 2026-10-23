import type { ElementDefinition } from 'cytoscape';

import type { GraphPackage } from '../../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../../common/folder-group.type.ts';
import { canvasEdgeOf } from '../utils/canvas-elements.spec.util.ts';

const sizedNodeAt = (id: string, x: number, y: number): ElementDefinition => {
  const data = { id, width: 40, height: 20 };
  const position = { x, y };
  const definition: ElementDefinition = { data, position };

  return definition;
};

const packageOf = (name: string): GraphPackage => {
  const pkg: GraphPackage = { name, path: name, tags: [], taskCount: 0 };

  return pkg;
};

/** Packages `a` (0, 0), `b` (100, 0), `c` (500, 0), `d` (250, 200) and `__proto__` (0, 200), 40 by 20 px; links `a>b` and `b>c`. */
export const BOX_ELEMENTS_STUB: ElementDefinition[] = [
  sizedNodeAt('a', 0, 0),
  sizedNodeAt('b', 100, 0),
  sizedNodeAt('c', 500, 0),
  sizedNodeAt('d', 250, 200),
  sizedNodeAt('__proto__', 0, 200),
  canvasEdgeOf('a', 'b'),
  canvasEdgeOf('b', 'c')
];

const ROOT_GROUP: FolderGroup = { folder: '', packages: [packageOf('d')] };

const APPS_GROUP: FolderGroup = { folder: 'apps', packages: [packageOf('a'), packageOf('b')] };

const PACKAGES_GROUP: FolderGroup = { folder: 'packages', packages: [packageOf('c')] };

/** `apps` holds `a` and `b`, `packages` holds `c`, the root folder holds `d`; `__proto__` is in no group. */
export const BOX_GROUPS_STUB: FolderGroup[] = [ROOT_GROUP, APPS_GROUP, PACKAGES_GROUP];

/** The box ids of `BOX_GROUPS_STUB`, sorted: the root folder, `apps`, then `packages`. */
export const BOX_IDS_STUB: string[] = ['\u0001', '\u0001apps', '\u0001packages'];

/** One folder holding the two package names that are keys of `Object.prototype`: the drawn `__proto__` and `constructor`. */
export const PROTO_NAMES_GROUP_STUB: FolderGroup = { folder: 'tools', packages: [packageOf('__proto__'), packageOf('constructor')] };

/** A group naming a package that is not drawn. */
export const GONE_GROUP_STUB: FolderGroup = { folder: 'apps', packages: [packageOf('gone')] };
