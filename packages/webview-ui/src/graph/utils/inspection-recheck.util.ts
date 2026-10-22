import { isLinkKept } from './link-kept.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { FolderInspection, Inspection, LinkInspection, TraceInspection } from '../common/inspection.type.ts';

const recheckLink = (current: LinkInspection, visible: ReadonlySet<string>, edges: GraphEdge[]): Inspection => {
  const isKept = isLinkKept(current, visible, edges);

  return isKept ? current : NO_INSPECTION;
};

const recheckTrace = (current: TraceInspection, visible: ReadonlySet<string>): Inspection => {
  const hasStart = visible.has(current.start);
  const hasEnd = visible.has(current.end);

  if (!hasStart) return NO_INSPECTION;

  const startOnly: Inspection = { kind: 'package', name: current.start };

  return hasEnd ? current : startOnly;
};

const recheckName = (current: Inspection, name: string, visible: ReadonlySet<string>): Inspection => {
  const isVisible = visible.has(name);

  return isVisible ? current : NO_INSPECTION;
};

/** A folder stays while any member is visible or a ghost; a `null` scene or an unknown folder ends it. */
const recheckFolder = (current: FolderInspection, visible: ReadonlySet<string>, scene: FolderScene | null): Inspection => {
  const members = scene?.members.get(current.folder) ?? [];
  const isHeld = (name: string): boolean => visible.has(name) || scene?.ghosts.has(name) === true;
  const hasHeld = members.some(isHeld);

  return hasHeld ? current : NO_INSPECTION;
};

/** What the page keeps showing after a filter change; hidden middle packages never end a trace (D5). */
export const recheckInspection = (
  current: Inspection,
  visible: ReadonlySet<string>,
  edges: GraphEdge[],
  scene: FolderScene | null
): Inspection => {
  switch (current.kind) {
    case 'none':
      return current;
    case 'package':
      return recheckName(current, current.name, visible);
    case 'link':
      return recheckLink(current, visible, edges);
    case 'folder':
      return recheckFolder(current, visible, scene);
    case 'picking':
      return recheckName(current, current.start, visible);
    case 'trace':
      return recheckTrace(current, visible);
  }
};
