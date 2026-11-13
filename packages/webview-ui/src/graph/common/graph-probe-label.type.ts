/**
 * One node's label against its box, in model px, read after `node.boundingBox()`: `width` the node's, `labelWidth` the
 * label Cytoscape measured (`_private.rstyle.labelWidth`, 0 while it measured none), `labelBoxWidth` its cached main
 * label box (`null` while there is none), `textMarginX` the resolved `text-margin-x`.
 */
export type ProbeLabelFit = {
  readonly width: number;
  readonly labelWidth: number;
  readonly labelBoxWidth: number | null;
  readonly textMarginX: number;
};
