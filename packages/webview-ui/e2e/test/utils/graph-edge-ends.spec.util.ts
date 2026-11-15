/** Runs in the page: the nodes whose edges Cytoscape still marks dirty; throws when the page exposes no probe. */
export const dirtyEdgeEndsNow = (): string[] => {
  const probe = window.tcGraphProbe;

  if (probe === undefined) throw new Error('graph e2e: the page exposes no probe to read edge ends with');

  return probe.dirtyEdgeEndIds();
};
