import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomFile, GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import { ATOM_FILE_CAP, ATOM_MORE_PREFIX } from '../common/graph-atom.const.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';

/** The files drawn: all of `free` up to one past the cap, else the cap's worth with the failed ones first, each part in order. */
const drawnFilesOf = (free: GraphAtomFile[], outcomes: Record<string, GraphAtomOutcome>): GraphAtomFile[] => {
  const isCapped = free.length > ATOM_FILE_CAP + 1;

  if (!isCapped) return free;

  const isFailed = (file: GraphAtomFile): boolean => outcomes[file.id] === 'failed';
  const isOther = (file: GraphAtomFile): boolean => !isFailed(file);
  const failed = free.filter(isFailed);
  const others = free.filter(isOther);
  const ranked = [...failed, ...others];

  return ranked.slice(0, ATOM_FILE_CAP);
};

/** The id of the count node of the group `umbrellaId`: `atom-more:<umbrellaId>`. */
export const moreIdOf = (umbrellaId: string): string => `${ATOM_MORE_PREFIX}${umbrellaId}`;

/** The file outcomes kept for `umbrellaId`; none while the host has sent none. */
export const outcomesOf = (
  byUmbrella: ReadonlyMap<string, Record<string, GraphAtomOutcome>>,
  umbrellaId: string
): Record<string, GraphAtomOutcome> => {
  const none: Record<string, GraphAtomOutcome> = {};

  return byUmbrella.get(umbrellaId) ?? none;
};

/** The ids the grid places: the drawn files, then the count node's when files are hidden. */
const gridIdsOf = (drawn: GraphAtomFile[], hidden: number, umbrellaId: string): string[] => {
  const ids = drawn.map((file) => file.id);

  if (hidden === 0) return ids;

  return [...ids, moreIdOf(umbrellaId)];
};

/**
 * The box `group` is drawn as against `placement`, or `null` when its umbrella is not shown, sized and in a package box,
 * or it has no file to draw. A file whose id is a task's is not drawn, since the id belongs to that task. A group of more
 * than one past the cap draws the cap's worth, failed files first, and counts the rest in `hidden`.
 */
export const atomSpecOf = (
  group: GraphAtomGroup,
  placement: AtomPlacement,
  outcomes: Record<string, GraphAtomOutcome>
): AtomDrawSpec | null => {
  const umbrellaSize = placement.sizes.get(group.umbrellaId);
  const isShown = placement.shown.has(group.umbrellaId);
  const hasBox = placement.pkgBoxes.has(group.umbrellaId);
  const isFree = (file: GraphAtomFile): boolean => !placement.pkgBoxes.has(file.id);
  const free = group.files.filter(isFree);
  const isDrawable = isShown && umbrellaSize !== undefined && hasBox && free.length > 0;

  if (!isDrawable) return null;

  const files = drawnFilesOf(free, outcomes);
  const hidden = free.length - files.length;
  const fileIds = gridIdsOf(files, hidden, group.umbrellaId);
  const spec: AtomDrawSpec = { umbrellaId: group.umbrellaId, umbrellaSize, fileIds, files, hidden };

  return spec;
};
