import { SCAN_AGAIN_TITLE } from '../common/details-imports.const.ts';
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

/** A card's drawn label, which its size is measured from: a collapsed folder reads `<name>/ <file count>`, a file its basename, a stub its package name. */
export const moduleLeafLabelOf = (leaf: ModuleLeaf): string => {
  if (leaf.kind !== 'dir') return leaf.label;

  return `${leaf.label} ${leaf.fileCount}`;
};
