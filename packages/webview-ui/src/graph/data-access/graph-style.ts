import type { StylesheetJson } from 'cytoscape';

import { NODE_FONT_SIZE } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

/**
 * The Cytoscape stylesheet: round-rectangle nodes sized from their data, label centred, 1 px frame; bezier edges with
 * a triangle at the dependency. `selected`, `highlighted` and `dimmed` are the classes `GraphView.select` applies.
 * Every colour comes from `colors`.
 */
export const graphStyleOf = (colors: ThemeColors, fontFamily: string): StylesheetJson => {
  const node = {
    shape: 'round-rectangle',
    width: 'data(width)',
    height: 'data(height)',
    label: 'data(id)',
    'text-valign': 'center',
    'text-halign': 'center',
    'font-size': NODE_FONT_SIZE,
    'font-family': fontFamily,
    color: colors.label,
    'background-color': colors.background,
    'border-width': 1,
    'border-color': colors.frame
  } as const;
  const edge = {
    'curve-style': 'bezier',
    'target-arrow-shape': 'triangle',
    width: 1,
    'line-color': colors.edge,
    'target-arrow-color': colors.edge
  } as const;
  const selectedNode = { 'border-width': 3, 'border-color': colors.selected };
  const highlightedNode = { 'border-width': 2, 'border-color': colors.highlighted };
  const highlightedEdge = { width: 2, 'line-color': colors.highlighted, 'target-arrow-color': colors.highlighted };
  const dimmed = { opacity: 0.25 };
  const style: StylesheetJson = [
    { selector: 'node', style: node },
    { selector: 'edge', style: edge },
    { selector: 'node.selected', style: selectedNode },
    { selector: 'node.highlighted', style: highlightedNode },
    { selector: 'edge.highlighted', style: highlightedEdge },
    { selector: '.dimmed', style: dimmed }
  ];

  return style;
};
