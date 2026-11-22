import type { Css, StylesheetStyle } from 'cytoscape';

import { ROUTE_RADIUS_PX } from '../common/graph-layout.const.ts';
import {
  MODULE_COUNT_FONT_PX,
  MODULE_COUNT_MIN_ZOOMED_PX,
  MODULE_LAZY_CLASS,
  MODULE_LINK_CLASS,
  MODULE_ROUTED_CLASS,
  MODULE_STUB_CLASS,
  MODULE_TYPE_CLASS
} from '../common/graph-module.const.ts';
import { DASHED_BORDER_PX, DASHED_LINE_PX } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

const STUB_NODE = { 'border-style': 'dashed', 'border-dash-pattern': DASHED_BORDER_PX } as const;

const LAZY_LINK = { 'line-style': 'dotted' } as const;

const TYPE_LINK = { 'line-style': 'dashed', 'line-dash-pattern': DASHED_LINE_PX } as const;

/** `node-position`: weights and distances are taken in the source → target centre frame `routeSegmentsOf` measures in. */
const ROUTED_LINK: Css.Edge = {
  'curve-style': 'round-segments',
  'segment-radii': [ROUTE_RADIUS_PX],
  'segment-weights': 'data(segWeights)',
  'segment-distances': 'data(segDistances)',
  'source-endpoint': 'data(srcEnd)',
  'target-endpoint': 'data(tgtEnd)',
  'edge-distances': 'node-position'
};

/**
 * The modules mode rules: a stub card drawn dashed; a module link labelled with its import count on the canvas
 * background, the label hidden below zoom 0.5 (`min-zoomed-font-size`); a lazy-only link dotted and a type-only link
 * dashed; a routed link drawn on its ELK route as `round-segments`, after the base edge rule so its `curve-style` wins.
 * Boxes take the task folder box rule and cards the base node rule.
 */
export const moduleRulesOf = (colors: ThemeColors, fontFamily: string): StylesheetStyle[] => {
  const link = {
    label: 'data(count)',
    'font-size': MODULE_COUNT_FONT_PX,
    'min-zoomed-font-size': MODULE_COUNT_MIN_ZOOMED_PX,
    'font-family': fontFamily,
    color: colors.label,
    'text-background-color': colors.background,
    'text-background-opacity': 1
  } as const;
  const rules: StylesheetStyle[] = [
    { selector: `node.${MODULE_STUB_CLASS}`, style: STUB_NODE },
    { selector: `edge.${MODULE_LINK_CLASS}`, style: link },
    { selector: `edge.${MODULE_LAZY_CLASS}`, style: LAZY_LINK },
    { selector: `edge.${MODULE_TYPE_CLASS}`, style: TYPE_LINK },
    { selector: `edge.${MODULE_ROUTED_CLASS}`, style: ROUTED_LINK }
  ];

  return rules;
};
