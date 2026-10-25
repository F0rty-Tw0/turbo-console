import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec } from '../common/atom-layout.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';

/**
 * The box `group` is drawn as against `placement`, or `null` when its umbrella is not shown, sized and in a package box,
 * or it has no file to draw. A file whose id is a task's is not drawn, since the id belongs to that task.
 */
export const atomSpecOf = (group: GraphAtomGroup, placement: AtomPlacement): AtomBoxSpec | null => {
  const umbrellaSize = placement.sizes.get(group.umbrellaId);
  const isShown = placement.shown.has(group.umbrellaId);
  const hasBox = placement.pkgBoxes.has(group.umbrellaId);
  const isFree = (id: string): boolean => !placement.pkgBoxes.has(id);
  const ids = group.files.map((file) => file.id);
  const fileIds = ids.filter(isFree);
  const isDrawable = isShown && umbrellaSize !== undefined && hasBox && fileIds.length > 0;

  if (!isDrawable) return null;

  const spec: AtomBoxSpec = { umbrellaId: group.umbrellaId, umbrellaSize, fileIds };

  return spec;
};
