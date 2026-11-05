import type { Css, StylesheetJson } from 'cytoscape';

import { PACKAGE_RUN_CLASS } from '../common/graph-task.const.ts';
import { FOCUS_TARGET_CLASS, NODE_BORDER_PX, SELECTED_BORDER_PX } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

const BOLD = { 'font-weight': 'bold' } as const;

/** A selected node's look past its border: bold, on the list's selection fill and label colour when the theme has them. */
const selectedFillOf = (colors: ThemeColors): Css.Node => {
  const { selection } = colors;

  if (selection === null) return BOLD;

  const filled = { ...BOLD, 'background-color': selection.fill, color: selection.label } as const;

  return filled;
};

/**
 * The selected node's border, then its fill, then the focus target's bold label. `:childless` keeps an expanded folder
 * box border-only; a package, a task, an atom file and a collapsed folder node take the fill. The weight stays out of
 * the node sizers, so a bold label draws inside the width the regular one was measured at. A selected package or
 * collapsed folder with a run state keeps the plain border, its run outline being the one ring (spec D14).
 */
export const selectionRulesOf = (colors: ThemeColors): StylesheetJson => {
  const selectedNode = { 'border-width': SELECTED_BORDER_PX, 'border-color': colors.selected };
  const runSelected = { 'border-width': NODE_BORDER_PX, 'border-color': colors.frame };
  const rules: StylesheetJson = [
    { selector: 'node.selected', style: selectedNode },
    { selector: `node.selected.${PACKAGE_RUN_CLASS}`, style: runSelected },
    { selector: 'node.selected:childless', style: selectedFillOf(colors) },
    { selector: `node.${FOCUS_TARGET_CLASS}`, style: BOLD }
  ];

  return rules;
};
