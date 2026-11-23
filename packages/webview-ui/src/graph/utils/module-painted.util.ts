import type { ModuleSelection } from '../../bridge/common/graph-view-state.type.ts';
import { DIR_PREFIX, FILE_PREFIX } from '../common/graph-module.const.ts';
import type { ModuleBox, ModuleLeaf, ModuleScene, ModuleSceneLink } from '../common/module-scene.type.ts';

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

/** The card that holds `id` in `scene`; `null` when a box or nothing does. */
const cardOf = (id: string, scene: ModuleScene, cardIds: string[]): string | null => {
  const held = heldAmongOf(id, scene, cardIds);

  if (held === null) return null;

  const isCard = cardIds.includes(held);

  return isCard ? held : null;
};

/** The node selection of `card`; `null` with no card. */
const cardPaintOf = (card: string | null): ModuleSelection | null => {
  if (card === null) return null;

  const painted: ModuleSelection = { kind: 'node', id: card };

  return painted;
};

/** What joins the cards `source` and `target`: the one card when both are it, else the scene's link between them. */
const linkPaintOf = (source: string | null, target: string | null, scene: ModuleScene): ModuleSelection | null => {
  if (source === null || target === null) return null;

  if (source === target) return cardPaintOf(source);

  const isLinkBetween = (link: ModuleSceneLink): boolean => link.source === source && link.target === target;
  const isDrawn = scene.links.some(isLinkBetween);
  const painted: ModuleSelection = { kind: 'link', source, target };

  return isDrawn ? painted : null;
};

/**
 * What to paint for the chosen `sel` in `scene`. A node: the card that holds it. A link: the one card that holds both its
 * ends, or the scene's link between the two cards that hold them. `null` when a box or nothing holds an end, or no link
 * joins the two cards, as for a type-only link with types hidden.
 */
export const paintTargetOf = (sel: ModuleSelection, scene: ModuleScene): ModuleSelection | null => {
  const cardIds = scene.leaves.map(idOfElement);

  if (sel.kind === 'node') {
    const card = cardOf(sel.id, scene, cardIds);
    const painted = cardPaintOf(card);

    return painted;
  }

  const source = cardOf(sel.source, scene, cardIds);
  const target = cardOf(sel.target, scene, cardIds);
  const painted = linkPaintOf(source, target, scene);

  return painted;
};

/**
 * Whether the chosen `sel` stays chosen once `scene` is drawn. A node: a card holds it, so a folder tap never drops it. A
 * link: something holds each end, a box included, so a folder opened over an end keeps it, unpainted until that folder
 * closes again.
 */
export const keepsSelection = (sel: ModuleSelection, scene: ModuleScene): boolean => {
  const target = paintTargetOf(sel, scene);

  if (sel.kind === 'node') return target !== null;

  const sourceHeld = heldOf(sel.source, scene);
  const targetHeld = heldOf(sel.target, scene);

  return sourceHeld !== null && targetHeld !== null;
};
