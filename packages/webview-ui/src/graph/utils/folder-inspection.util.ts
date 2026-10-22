import { traceOf } from './trace.util.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { TraceResult } from '../common/trace.type.ts';

const traceMembersOf = (start: string, end: string, trace: TraceResult | null): string[] => {
  const path = trace?.path ?? [];

  return [start, end, ...path];
};

/** The packages an inspection holds; a trace's path comes from `trace`, else only its two ends count. A folder holds none. */
const packagesOf = (inspection: Inspection, trace: TraceResult | null): string[] => {
  switch (inspection.kind) {
    case 'none':
    case 'folder':
      return [];
    case 'package':
      return [inspection.name];
    case 'link':
      return [inspection.source, inspection.target];
    case 'picking':
      return [inspection.start];
    case 'trace':
      return traceMembersOf(inspection.start, inspection.end, trace);
  }
};

/** The collapsed folders that hold a package of the inspection, each once, in order of first appearance. */
export const foldersToExpandOf = (inspection: Inspection, trace: TraceResult | null, scene: FolderScene): string[] => {
  const packages = packagesOf(inspection, trace);
  const folders = packages.map((name: string): string | undefined => scene.folderOf.get(name));
  const isCollapsed = (folder: string | undefined): folder is string => folder !== undefined && scene.collapsed.has(folder);
  const collapsed = folders.filter(isCollapsed);

  const unique = new Set(collapsed);

  return [...unique];
};

const traceFor = (current: Inspection, scene: FolderScene): TraceResult | null => {
  if (current.kind !== 'trace') return null;

  return traceOf(scene.edges, current.start, current.end);
};

/** `{ kind: 'folder', folder }` when `current` holds a package of the just collapsed `folder`; else `current` itself. */
export const collapsedInspectionOf = (current: Inspection, folder: string, scene: FolderScene): Inspection => {
  const packages = packagesOf(current, traceFor(current, scene));
  const isInside = (name: string): boolean => scene.folderOf.get(name) === folder;
  const isHeld = packages.some(isInside);

  if (!isHeld) return current;

  const inspection: Inspection = { kind: 'folder', folder };

  return inspection;
};

/** The folders with at least one visible member; none for a `null` scene. */
export const shownFoldersOf = (scene: FolderScene | null, visible: ReadonlySet<string>): Set<string> => {
  const shown = new Set<string>();

  if (scene === null) return shown;

  for (const [folder, members] of scene.members) {
    const hasVisible = members.some((name: string): boolean => visible.has(name));

    if (hasVisible) shown.add(folder);
  }

  return shown;
};
