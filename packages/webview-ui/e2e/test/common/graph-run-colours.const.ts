import type { RunOutline } from '../../common/graph.type.ts';

/** The dark stub's `--vscode-charts-yellow`, `#cca700`, as Cytoscape reports it and as the page draws it. */
export const RUNNING_RGB = 'rgb(204, 167, 0)';

/** The run outline of a running node in the dark theme: 2 wide, its colour compared without spaces. */
export const RUNNING_OUTLINE: RunOutline = { width: 2, colour: 'rgb(204,167,0)' };

/** The dark stub's `--vscode-testing-iconPassed`, `#73c991`, as Cytoscape reports it and as the page draws it. */
export const PASSED_RGB = 'rgb(115, 201, 145)';

/** The run outline of a failed node in the dark theme: `--vscode-testing-iconFailed`, `#f14c4c`, 2 wide. */
export const FAILED_OUTLINE: RunOutline = { width: 2, colour: 'rgb(241,76,76)' };
