import type { RingColours } from '../../common/graph-ring.type.ts';
import type { RunOutline } from '../../common/graph.type.ts';
import { THEME_DARK_STUB } from '../stubs/graph-theme.stub.ts';

/** The dark stub's `--vscode-charts-yellow`, `#cca700`, as Cytoscape reports it and as the page draws it. */
export const RUNNING_RGB = 'rgb(204, 167, 0)';

/** The run outline of a running node in the dark theme: 2 wide, its colour compared without spaces. */
export const RUNNING_OUTLINE: RunOutline = { width: 2, colour: 'rgb(204,167,0)' };

/** The dark stub's `--vscode-testing-iconPassed`, `#73c991`, as Cytoscape reports it and as the page draws it. */
export const PASSED_RGB = 'rgb(115, 201, 145)';

/** The run outline of a failed node in the dark theme: `--vscode-testing-iconFailed`, `#f14c4c`, 2 wide. */
export const FAILED_OUTLINE: RunOutline = { width: 2, colour: 'rgb(241,76,76)' };

/** The run outline of a continuous node in the dark theme: `--vscode-charts-green`, `#89d185`, 2 wide. */
export const CONTINUOUS_OUTLINE: RunOutline = { width: 2, colour: 'rgb(137,209,133)' };

/** The run outline of a node that failed to start in the dark theme: `--vscode-errorForeground`, `#f85149`, 2 wide. */
export const FAILED_TO_START_OUTLINE: RunOutline = { width: 2, colour: 'rgb(248,81,73)' };

/** The dark stub's selection ring colour, `--vscode-focusBorder` `#0078d4`, as Cytoscape reports it and as the page draws it. */
const SELECTED_RGB: string = THEME_DARK_STUB.expected.selected;

/** The ring of a running node that is selected, in the dark theme: the run ring is drawn and the selection ring is not. */
export const RUN_RING: RingColours = { drawn: RUNNING_RGB, absent: SELECTED_RGB };

/** The ring of a selected node with no run state, in the dark theme: the selection ring is drawn and the run ring is not. */
export const SELECTION_RING: RingColours = { drawn: SELECTED_RGB, absent: RUNNING_RGB };

/** The ring of a selected running card, in the dark theme: its running bar is drawn and the passed colour is not. */
export const SELECTED_BAR_INK: RingColours = { drawn: RUNNING_RGB, absent: PASSED_RGB };

/** The ring of a selected running card, in the dark theme: its selection border is drawn and the passed colour is not. */
export const SELECTED_BORDER_INK: RingColours = { drawn: SELECTED_RGB, absent: PASSED_RGB };
