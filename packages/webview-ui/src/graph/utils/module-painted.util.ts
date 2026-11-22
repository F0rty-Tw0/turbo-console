import type { ModuleBox, ModuleLeaf, ModuleScene } from '../common/module-scene.type.ts';

const DIR_PREFIX = 'dir:';

const FILE_PREFIX = 'file:';

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

/**
 * What holds `id` in `scene`: `id` while the scene draws it, as a card or a box; else the nearest folder around it, by its
 * id path, that the scene draws as a card. `null` when the first drawn folder around it is an open box or none is drawn,
 * as for a test file now hidden or an id gone from the scene.
 */
export const heldOf = (id: string, scene: ModuleScene): string | null => {
  const boxIds = scene.boxes.map(idOfElement);
  const cardIds = scene.leaves.map(idOfElement);
  const drawn = new Set([...boxIds, ...cardIds]);
  const isDrawn = drawn.has(id);

  if (isDrawn) return id;

  const path = pathOf(id);
  const folders = foldersAroundOf(path);
  const isFolderDrawn = (folder: string): boolean => drawn.has(folder);
  const nearest = folders.find(isFolderDrawn) ?? null;
  const isCard = nearest !== null && cardIds.includes(nearest);

  return isCard ? nearest : null;
};

/** The card to paint for the chosen `id` in `scene`: the card that holds it; `null` when a box or nothing does. */
export const paintTargetOf = (id: string, scene: ModuleScene): string | null => {
  const held = heldOf(id, scene);
  const cardIds = scene.leaves.map(idOfElement);
  const isCard = held !== null && cardIds.includes(held);

  return isCard ? held : null;
};

/** Whether the chosen `id` stays chosen once `scene` is drawn: a card holds it, so a folder tap never drops it. */
export const keepsSelection = (id: string, scene: ModuleScene): boolean => {
  const target = paintTargetOf(id, scene);

  return target !== null;
};
