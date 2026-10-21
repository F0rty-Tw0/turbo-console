import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';

/** Case-insensitive substring of the name or the path; `''` matches everything, nothing is trimmed. */
export const matchesSearch = (pkg: GraphPackage, search: string): boolean => {
  const needle = search.toLowerCase();
  const inName = pkg.name.toLowerCase().includes(needle);
  const inPath = pkg.path.toLowerCase().includes(needle);

  return inName || inPath;
};
