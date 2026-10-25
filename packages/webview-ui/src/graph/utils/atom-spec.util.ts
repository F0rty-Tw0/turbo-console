import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';

/**
 * The box `group` is drawn as against `placement`, or `null` when its umbrella is not shown, sized and in a package box,
 * or it has no file to draw. A file whose id is a task's is not drawn, since the id belongs to that task.
 */
export const atomSpecOf = (
  group: GraphAtomGroup,
  placement: AtomPlacement,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ranks the files in the next task
  _outcomes: Record<string, GraphAtomOutcome>
): AtomDrawSpec | null => {
  const umbrellaSize = placement.sizes.get(group.umbrellaId);
  const isShown = placement.shown.has(group.umbrellaId);
  const hasBox = placement.pkgBoxes.has(group.umbrellaId);
  const isFree = (id: string): boolean => !placement.pkgBoxes.has(id);
  const files = group.files.filter((file) => isFree(file.id));
  const fileIds = files.map((file) => file.id);
  const isDrawable = isShown && umbrellaSize !== undefined && hasBox && fileIds.length > 0;

  if (!isDrawable) return null;

  const spec: AtomDrawSpec = { umbrellaId: group.umbrellaId, umbrellaSize, fileIds, files, hidden: 0 };

  return spec;
};
