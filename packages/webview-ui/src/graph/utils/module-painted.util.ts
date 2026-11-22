import type { ModuleBox, ModuleLeaf, ModuleScene } from '../common/module-scene.type.ts';

const idOfLeaf = (leaf: ModuleLeaf): string => leaf.id;

/** The box or leaf `id` sits in within `scene`; `null` at the root, when it is not drawn or with no scene. */
const parentIn = (scene: ModuleScene | null, id: string): string | null => {
  const isId = (element: ModuleBox | ModuleLeaf): boolean => element.id === id;
  const element = scene?.leaves.find(isId) ?? scene?.boxes.find(isId);

  return element?.parent ?? null;
};

/** `id` while it is a card in `cards`, else the nearest box around it in `before` that is now a card. */
const keptCardOf = (id: string | null, before: ModuleScene | null, cards: ReadonlySet<string>): string | null => {
  if (id === null) return null;

  const isCard = cards.has(id);

  if (isCard) return id;

  return keptCardOf(parentIn(before, id), before, cards);
};

/**
 * The card to paint once `after` replaces `before`: `painted` while it is still a card, else the nearest folder around it
 * that `after` draws as a card, the one just collapsed over it; `null` when neither is, as for a test file now hidden or a
 * folder card opened into a box, which takes no paint.
 */
export const paintedAfterRedrawOf = (painted: string | null, before: ModuleScene | null, after: ModuleScene): string | null => {
  const cards = new Set(after.leaves.map(idOfLeaf));

  return keptCardOf(painted, before, cards);
};
