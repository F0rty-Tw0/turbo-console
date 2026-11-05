import type { RunOutline } from '../../common/graph.type.ts';

/** The dark stub's `--vscode-charts-yellow`, `#cca700`, as Cytoscape reports it and as the page draws it. */
export const RUNNING_RGB = 'rgb(204, 167, 0)';

/** The run outline of a running node in the dark theme: 2 wide, its colour compared without spaces. */
export const RUNNING_OUTLINE: RunOutline = { width: 2, colour: 'rgb(204,167,0)' };
