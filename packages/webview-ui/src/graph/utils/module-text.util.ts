import { endOf } from './module-end.util.ts';
import { SCAN_AGAIN_TITLE } from '../common/details-imports.const.ts';
import { MODULE_NO_FOCUS_TEXT } from '../common/graph-module.const.ts';
import type { ModuleLeaf } from '../common/module-scene.type.ts';

/** `count` is `null` while no found list with sites is known. */
export const sitesHeadingOf = (heading: string, count: number | null): string => {
  if (count === null) return heading;

  return `${heading} (${count})`;
};

/** Names the list, so the two Scan again buttons of a file view have different accessible names. */
export const sitesScanLabelOf = (heading: string): string => `${SCAN_AGAIN_TITLE}: ${heading}`;

/** The scan line of Waiting and Loading (spec §7.2). */
export const scanningTextOf = (name: string): string => `Scanning ${name}…`;

/** The notice shown when a graph state no longer lists the package modules mode shows (spec §7.2). */
export const moduleGoneTextOf = (name: string): string => `${name} is no longer in the workspace`;

/** A scene id as the panels name it: a file's path, a folder's path with a trailing `/`, a stub's package name. */
export const moduleIdLabelOf = (id: string): string => {
  const end = endOf(id);

  if (end.kind === 'file') return end.path;

  if (end.kind === 'dir') return `${end.path}/`;

  return end.name;
};

/** The Focus section's line: the focus target's label, or `MODULE_NO_FOCUS_TEXT` while nothing is focused. */
export const moduleFocusTextOf = (focus: string | null): string => {
  if (focus === null) return MODULE_NO_FOCUS_TEXT;

  return moduleIdLabelOf(focus);
};

/** A card's drawn label, which its size is measured from: a collapsed folder reads `<name>/ <file count>`, a file its basename, a stub its package name. */
export const moduleLeafLabelOf = (leaf: ModuleLeaf): string => {
  if (leaf.kind !== 'dir') return leaf.label;

  return `${leaf.label} ${leaf.fileCount}`;
};
