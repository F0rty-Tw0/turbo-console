import type { GraphAtomFile } from '../../../bridge/common/graph-state.type.ts';

/** A file of an Atomizer group that is not live; `specPath` is the same for every file unless a spec needs its own. */
export const fileOf = (id: string, specPath = 'a.spec.ts'): GraphAtomFile => {
  const file: GraphAtomFile = { id, specPath, isLive: false };

  return file;
};
