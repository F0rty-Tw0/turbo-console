import type { Css, NodeSingular, StylesheetJsonBlock } from 'cytoscape';

import { UMBRELLA_NODE } from './graph-task-umbrella-style.ts';
import type { GraphAffectedMark } from '../../bridge/common/graph-affected.type.ts';
import { AFFECTED_MARKS, RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import {
  ATOM_BOX_CLASS,
  ATOM_BOX_PADDING_PX,
  ATOM_FILE_CLASS,
  ATOM_FILE_SIZE,
  ATOM_LIVE_CLASS,
  ATOM_MORE_CLASS,
  ATOM_OUTCOME_CLASSES,
  ATOM_UMBRELLA_CLASS
} from '../common/graph-atom.const.ts';
import { PACKAGE_GLYPH } from '../common/graph-glyph.const.ts';
import {
  AFFECTED_UNDERLAY_OPACITY,
  AFFECTED_UNDERLAY_PADDING_PX,
  BOX_FRAMED_CLASS,
  RUN_CLASS_PREFIX,
  SCRIPTS_BOX_CLASS,
  SCRIPTS_BOX_DASH_PX,
  TASK_BOX_CLASS,
  TASK_BOX_DASH_PX,
  TASK_FOLDER_CLASS,
  TASK_NODE_CLASS
} from '../common/graph-task.const.ts';
import { DASHED_BORDER_PX, FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { affectedClassOf } from '../utils/affected-class.util.ts';
import { glyphOf } from '../utils/glyph.util.ts';

/** A task node shows its task name; its id is `package#name`. */
const TASK_NODE = { label: 'data(label)' } as const;

/**
 * A file node is a pill: its corners are half its 20 px height. It reads its file name, one line cut with an ellipsis 4 px short of each
 * round end: the curve reaches about 3 px in at the top and bottom of a 13 px line.
 */
const ATOM_FILE = {
  label: 'data(label)',
  'text-wrap': 'ellipsis',
  'text-max-width': `${ATOM_FILE_SIZE.width - 8}px`,
  'corner-radius': '10px'
} as const;

/**
 * An expanded group's box pads its content and sizes from the nodes, not from their labels; see-through, so a task link
 * drawn under it shows.
 */
const ATOM_BOX = { padding: `${ATOM_BOX_PADDING_PX}px`, 'compound-sizing-wrt-labels': 'exclude', 'background-opacity': 0 } as const;

/** A live file's border and outline are dashed; a solid outcome outline would hide a dashed border alone. */
const ATOM_LIVE = { 'border-style': 'dashed', 'border-dash-pattern': DASHED_BORDER_PX, 'outline-style': 'dashed' } as const;

const frameTitleXOf = (node: NodeSingular): number => Number(node.data('frameTitleX'));

const frameTitleYOf = (node: NodeSingular): number => Number(node.data('frameTitleY'));

/**
 * A `box-framed` titled-row box is drawn on its ELK frame: its padding, minimum size and the px bias of each side come
 * from the frame data `applyBoxFrames` writes, and its title margins put the title at the placeholder. Not annotated
 * `Css.Node`: Cytoscape's typings lack `min-height-bias-bottom` (cytoscape 3.34.4 `index.d.ts`), which it does read.
 */
const FRAMED_BOX = {
  padding: 'data(framePadding)',
  'min-width': 'data(frameMinWidth)',
  'min-height': 'data(frameMinHeight)',
  'min-width-bias-left': 'data(frameLeft)',
  'min-width-bias-right': 'data(frameRight)',
  'min-height-bias-top': 'data(frameTop)',
  'min-height-bias-bottom': 'data(frameBottom)',
  'text-margin-x': frameTitleXOf,
  'text-margin-y': frameTitleYOf
} as const;

/** A node's state glyph, a space and its label. */
const glyphLabelOf = (node: NodeSingular): string => `${glyphOf(node.classes())} ${node.data('label')}`;

/** A package task box's glyph, a space and its title. */
const boxGlyphLabelOf = (node: NodeSingular): string => `${PACKAGE_GLYPH} ${node.data('title')}`;

/** With a glyph font family a node draws a glyph before its label (its state glyph, unless `labelOf` says otherwise); without one its style is unchanged. */
const glyphedOf = (style: Css.Node, glyphFamily: string | null, labelOf = glyphLabelOf): Css.Node => {
  if (glyphFamily === null) return style;

  const glyphed: Css.Node = { ...style, label: labelOf, 'font-family': glyphFamily };

  return glyphed;
};

/** A file's outcome as a 2 px outline; a run outline after it wins for a running file. */
const outcomeRuleOf = (className: string, color: string): StylesheetJsonBlock => {
  const style = { 'outline-color': color, 'outline-width': 2, 'outline-offset': 0 };
  const rule: StylesheetJsonBlock = { selector: `node.${className}`, style };

  return rule;
};

/** A task's run state as a 2 px outline at its frame, as wide as a file's outcome outline; the run rule wins over it by stylesheet order. */
const runRuleOf = (colors: ThemeColors, state: GraphRunState): StylesheetJsonBlock => {
  const style = { 'outline-color': colors.runs[state], 'outline-width': 2, 'outline-offset': 0 };
  const rule: StylesheetJsonBlock = { selector: `node.${RUN_CLASS_PREFIX}${state}`, style };

  return rule;
};

/**
 * A selected task keeps its selection border alone: its run outline would draw a second ring, and its glyph still names
 * the run state.
 */
const selectedRunRuleOf = (state: GraphRunState): StylesheetJsonBlock => {
  const style = { 'outline-width': 0 };
  const rule: StylesheetJsonBlock = { selector: `node.${TASK_NODE_CLASS}.selected.${RUN_CLASS_PREFIX}${state}`, style };

  return rule;
};

/** An affected task's halo: the affected colour under the node, `AFFECTED_UNDERLAY_PADDING_PX` past its frame. */
const haloRuleOf = (colors: ThemeColors, mark: GraphAffectedMark): StylesheetJsonBlock => {
  const style = {
    'underlay-color': colors.affected,
    'underlay-opacity': AFFECTED_UNDERLAY_OPACITY[mark],
    'underlay-padding': AFFECTED_UNDERLAY_PADDING_PX
  };
  const name = affectedClassOf(mark);
  const rule: StylesheetJsonBlock = { selector: `node.${name}`, style };

  return rule;
};

/** A dimmed node's `opacity` does not reach its underlay, so a dimmed affected task's halo fades by `dimmedOpacity` here. */
const dimmedHaloRuleOf = (colors: ThemeColors, mark: GraphAffectedMark): StylesheetJsonBlock => {
  const style = { 'underlay-opacity': AFFECTED_UNDERLAY_OPACITY[mark] * colors.dimmedOpacity };
  const name = affectedClassOf(mark);
  const rule: StylesheetJsonBlock = { selector: `node.dimmed.${name}`, style };

  return rule;
};

/** The halo rules of both marks, then their dimmed rules, so a dimmed one wins by stylesheet order. */
const affectedRulesOf = (colors: ThemeColors): StylesheetJsonBlock[] => {
  const halos = AFFECTED_MARKS.map((mark) => haloRuleOf(colors, mark));
  const dimmedHalos = AFFECTED_MARKS.map((mark) => dimmedHaloRuleOf(colors, mark));

  return [...halos, ...dimmedHalos];
};

/**
 * The task mode rules: a `task` node reads its name, an `atom-umbrella` lifts its name half a chip row to leave the row
 * room, an `atom-file` reads its file name and an `atom-box` pads its content, an `atom-<outcome>` class outlines a
 * file (dashed border when `atom-live`), a `run-<state>` class outlines a task or file after them (a selected task
 * drops that outline), and a `task-box` draws a dashed frame and `boxTitle` on the page and in exports (the box
 * see-through, its title on a backdrop of the theme background, so a task link drawn under it passes behind the title), left-aligned
 * one padding in from the frame, at least `data(minWidth)` wide inside its padding, the extra width on the right so its
 * tasks keep their place, while a `box-framed` one (a titled-row box: one task, so ELK reserves a title row above it
 * and a link entering that task's top centre passes below the title) is drawn on its ELK frame with its title at the
 * placeholder instead; a `task-scripts` box inside it does the same with the `SCRIPTS_BOX_DASH_PX` dashes, so the two
 * frames read apart, and a `task-folder` box around package boxes keeps the solid package-mode folder frame with the
 * same title, since task mode has no DOM header rows. `left-inside` starts a compound's label two paddings in, so the
 * margin takes one back. They come after the `exporting` rule, so an exported task box keeps this alignment. With a
 * `glyphFamily` the `task` and `atom-file` rules draw the state glyph before the name, and a package `task-box` draws
 * the package glyph before its title (Scripts and folder boxes stay plain), in that font list; an `atom-more` node
 * carries only its own class, so it keeps the plain file rule. Last, an `affected-<mark>` class draws a halo under the
 * node, faded by `dimmedOpacity` while the node is `dimmed`.
 */
export const taskRulesOf = (colors: ThemeColors, boxTitle: Css.Node, glyphFamily: string | null): StylesheetJsonBlock[] => {
  const titledBox = {
    ...boxTitle,
    'text-halign': 'left-inside',
    'text-margin-x': -FOLDER_PADDING_PX,
    'min-width': 'data(minWidth)',
    'min-width-bias-left': '0%',
    'min-width-bias-right': '100%',
    'background-opacity': 0,
    'text-background-color': colors.background,
    'text-background-opacity': 1
  } as const;
  const taskBox = { ...titledBox, 'border-style': 'dashed', 'border-dash-pattern': TASK_BOX_DASH_PX } as const;
  const scriptsBox = { ...taskBox, 'border-dash-pattern': SCRIPTS_BOX_DASH_PX } as const;
  const taskFolder = { ...titledBox, 'border-style': 'solid' } as const;
  const runRules = RUN_STATES.map((state) => runRuleOf(colors, state));
  const selectedRunRules = RUN_STATES.map(selectedRunRuleOf);
  const outcomeRules = [
    outcomeRuleOf(ATOM_OUTCOME_CLASSES.passed, colors.runs.passed),
    outcomeRuleOf(ATOM_OUTCOME_CLASSES.failed, colors.runs.failed),
    outcomeRuleOf(ATOM_OUTCOME_CLASSES.cached, colors.cached)
  ];
  const packageBox = glyphedOf(taskBox, glyphFamily, boxGlyphLabelOf);
  const taskNode = glyphedOf(TASK_NODE, glyphFamily);
  const atomFile = glyphedOf(ATOM_FILE, glyphFamily);
  const affectedRules = affectedRulesOf(colors);
  const rules: StylesheetJsonBlock[] = [
    { selector: `node.${TASK_NODE_CLASS}`, style: taskNode },
    { selector: `node.${ATOM_UMBRELLA_CLASS}`, style: UMBRELLA_NODE },
    { selector: `node:parent.${TASK_BOX_CLASS}`, style: packageBox },
    { selector: `node:parent.${TASK_BOX_CLASS}.${BOX_FRAMED_CLASS}`, style: FRAMED_BOX },
    { selector: `node:parent.${SCRIPTS_BOX_CLASS}`, style: scriptsBox },
    { selector: `node:parent.${TASK_FOLDER_CLASS}`, style: taskFolder },
    { selector: `node.${ATOM_FILE_CLASS}`, style: atomFile },
    { selector: `node.${ATOM_MORE_CLASS}`, style: ATOM_FILE },
    { selector: `node:parent.${ATOM_BOX_CLASS}`, style: ATOM_BOX },
    ...outcomeRules,
    { selector: `node.${ATOM_LIVE_CLASS}`, style: ATOM_LIVE },
    ...runRules,
    ...selectedRunRules,
    ...affectedRules
  ];

  return rules;
};
