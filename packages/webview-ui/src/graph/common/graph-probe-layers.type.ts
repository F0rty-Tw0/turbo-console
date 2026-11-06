/** What `drawWithoutLayers` reads of Cytoscape: `renderer` exists at runtime but not in the typings, and its value is untyped. */
export type ProbeLayerSource = {
  readonly forceRender: () => unknown;
  readonly renderer?: () => unknown;
};
