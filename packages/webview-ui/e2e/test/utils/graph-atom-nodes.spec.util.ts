import { sortedNames } from './graph-package.spec.util.ts';

/** What the page objects pass in: anything that reads the drawn node ids, as `GraphProbePage` does. */
type NodeIdsReader = { readonly nodeIds: () => Promise<string[]> };

/** Of `ids`, the sorted ones the probe reports drawn. */
export const drawnIdsOf = async (probe: NodeIdsReader, ids: string[]): Promise<string[]> => {
  const drawn = await probe.nodeIds();
  const present = drawn.filter((id) => ids.includes(id));

  return sortedNames(present);
};
