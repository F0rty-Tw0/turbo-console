import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';

/** A selected node's fill and label colour: the list's active selection. */
export type SelectionColors = {
  readonly fill: string;
  readonly label: string;
};

/** The graph's colours, resolved from the `--vscode-*` theme variables. */
export type ThemeColors = {
  readonly background: string;
  readonly label: string;
  readonly edge: string;
  readonly selected: string;
  readonly highlighted: string;
  readonly frame: string;
  /** The outline of an Atomizer file node whose test result came from the cache. */
  readonly cached: string;
  /** The outline of a task node in each run state. */
  readonly runs: Readonly<Record<GraphRunState, string>>;
  /** A selected node's fill and label; `null` when the theme sets no list selection colours (high contrast), so it keeps its editor fill. */
  readonly selection: SelectionColors | null;
  /** The opacity of a dimmed node, edge or box: 0.25, raised in a high contrast theme so it keeps 3:1. */
  readonly dimmedOpacity: number;
};

/** Returns a CSS custom property's computed value, `''` when it is unset. */
export type CssVariableReader = (name: string) => string;
