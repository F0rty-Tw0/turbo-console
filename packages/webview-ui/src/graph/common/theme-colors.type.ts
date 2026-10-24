import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';

/** The graph's colours, resolved from the `--vscode-*` theme variables. */
export type ThemeColors = {
  readonly background: string;
  readonly label: string;
  readonly edge: string;
  readonly selected: string;
  readonly highlighted: string;
  readonly frame: string;
  /** The outline of a task node in each run state. */
  readonly runs: Readonly<Record<GraphRunState, string>>;
};

/** Returns a CSS custom property's computed value, `''` when it is unset. */
export type CssVariableReader = (name: string) => string;
