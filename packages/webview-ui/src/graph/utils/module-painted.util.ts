import { DIR_PREFIX, FILE_PREFIX } from '../common/graph-module.const.ts';
import type { ModuleBox, ModuleLeaf, ModuleScene } from '../common/module-scene.type.ts';

const PATH_SEPARATOR = '/';

const idOfElement = (element: ModuleBox | ModuleLeaf): string => element.id;

/** The path a `file:` or `dir:` id names; `''` for a stub, which sits at the root, so its name's `/` names no folder. */
const pathOf = (id: string): string => {
  const isFile = id.startsWith(FILE_PREFIX);
  const isDir = id.startsWith(DIR_PREFIX);

  if (isFile) return id.slice(FILE_PREFIX.length);

  if (isDir) return id.slice(DIR_PREFIX.length);

  return '';
};

/** The folder ids around `path`, nearest first: `src/lib/b.ts` gives `dir:src/lib`, then `dir:src`; none at the root. */
const foldersAroundOf = (path: string): string[] => {
  const cut = path.lastIndexOf(PATH_SEPARATOR);

  if (cut < 0) return [];

  const parent = path.slice(0, cut);
  const parentId = `${DIR_PREFIX}${parent}`;
  const further = foldersAroundOf(parent);
  const folders = [parentId, ...further];

  return folders;
};

/** `heldOf` over the scene's card ids, built once by the caller. */
const heldAmongOf = (id: string, scene: ModuleScene, cardIds: string[]): string | null => {
  const boxIds = scene.boxes.map(idOfElement);
  const drawn = new Set([...boxIds, ...cardIds]);
  const isDrawn = drawn.has(id);
  const isFile = id.startsWith(FILE_PREFIX);
  const isIncluded = scene.fileIds.includes(id);

  if (isDrawn) return id;

  if (isFile && !isIncluded) return null;

  const path = pathOf(id);
  const folders = foldersAroundOf(path);
  const isFolderDrawn = (folder: string): boolean => drawn.has(folder);
  const nearest = folders.find(isFolderDrawn);

  if (nearest === undefined) return null;

  const isCard = cardIds.includes(nearest);

  return isCard ? nearest : null;
};

/**
 * What holds `id` in `scene`: `id` while the scene draws it, as a card or a box; else the nearest folder around it, by its
 * id path, that the scene draws as a card. `null` for a file the scene's view leaves out (`scene.fileIds`), as a test file
 * now hidden, even under a collapsed folder; `null` too when the first drawn folder around it is an open box or none is
 * drawn, as for an id gone from the scene.
 */
export const heldOf = (id: string, scene: ModuleScene): string | null => {
  const cardIds = scene.leaves.map(idOfElement);
  const held = heldAmongOf(id, scene, cardIds);

  return held;
};

/** The card to paint for the chosen `id` in `scene`: the card that holds it; `null` when a box or nothing does. */
export const paintTargetOf = (id: string, scene: ModuleScene): string | null => {
  const cardIds = scene.leaves.map(idOfElement);
  const held = heldAmongOf(id, scene, cardIds);

  if (held === null) return null;

  const isCard = cardIds.includes(held);

  return isCard ? held : null;
};

/** Whether the chosen `id` stays chosen once `scene` is drawn: a card holds it, so a folder tap never drops it. */
export const keepsSelection = (id: string, scene: ModuleScene): boolean => {
  const target = paintTargetOf(id, scene);

  return target !== null;
};
