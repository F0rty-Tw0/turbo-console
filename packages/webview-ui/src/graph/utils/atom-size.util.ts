import { ATOM_COUNTS_LINE_PX } from '../common/graph-atom.const.ts';
import type { UmbrellaSizers } from '../common/graph-page.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';

/** The longest counts line a group of `fileCount` files can show: every count at the file count. */
export const widestCountsOf = (fileCount: number): string => `${fileCount} files · ${fileCount} cached · ${fileCount} failed`;

/** An umbrella's node: wide enough for its name or its widest counts line, one counts line taller than its name. */
export const umbrellaSizeOf = (sizers: UmbrellaSizers, name: string, fileCount: number): NodeSize => {
  const nameSize = sizers.name(name);
  const countsSize = sizers.counts(widestCountsOf(fileCount));
  const size: NodeSize = { width: Math.max(nameSize.width, countsSize.width), height: nameSize.height + ATOM_COUNTS_LINE_PX };

  return size;
};
