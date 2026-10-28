import type { GuideItem } from './details.type.ts';

export const EMPTY_LEAD_TEXT = 'Select a package or a link to see its facts here.';

const PACKAGE_GUIDE: GuideItem = {
  icon: 'package',
  name: 'A package',
  text: 'Click it on the graph, or press `Enter` on its name in Controls.'
};

const LINK_GUIDE: GuideItem = {
  icon: 'arrow-right',
  name: 'A link',
  text: "Click an arrow to see the package.json entry behind it. From the keyboard, use Explain in a package's lists."
};

const TRACE_GUIDE: GuideItem = {
  icon: 'git-commit',
  name: 'A path between two',
  text: 'Select a package, choose Start trace, then pick the other end.'
};

/** A backtick pair in `text`, as in `EMPTY_FOOTER_TEXT`, marks a key name drawn as a `kbd`. */
export const EMPTY_GUIDE: GuideItem[] = [PACKAGE_GUIDE, LINK_GUIDE, TRACE_GUIDE];

export const EMPTY_FOOTER_TEXT = '`Esc` on the graph clears what you selected.';

export const ROOT_PATH_TEXT = '(root)';

export const MANIFEST_NAME = 'package.json';

export const NO_TAGS_TEXT = 'No tags';

export const OPEN_DETAILS_LABEL = 'View Package Details';

export const FOCUS_LABEL = 'Focus';

export const CLEAR_FOCUS_LABEL = 'Clear focus';

export const EXCLUDE_LABEL = 'Exclude';

export const FOCUS_FOLDER_LABEL = 'Focus folder';

export const EXCLUDE_FOLDER_LABEL = 'Exclude folder';

export const SHOW_ALL_IN_FOLDER_LABEL = 'Show all in folder';

export const START_TRACE_LABEL = 'Start trace';

export const START_TRACE_TITLE = 'Pick a second package to highlight every dependency path between the two';

export const EXPLAIN_LABEL = 'Explain';

export const HIDDEN_TEXT = 'hidden';

export const NONE_TEXT = 'None';

export const NO_MATCH_TEXT = 'No match';

export const OPEN_MANIFEST_LABEL = 'Open package.json';

export const NO_ENTRY_TEXT = 'No entry';

export const UNREADABLE_TEXT = 'Unreadable';

export const PICKING_LEAD_TEXT = 'Select the package to trace to, here or on the graph.';

export const FILTER_LABEL = 'Filter packages';

export const CANCEL_LABEL = 'Cancel';

export const CLEAR_TRACE_LABEL = 'Clear trace';

export const SWAP_ENDS_LABEL = 'Swap ends';

export const SHOW_LABEL = 'Show';

export const DEPENDS_ON_TEXT = 'depends on';

export const LINK_HEADING_TEXT = 'Dependency';

export const TRACE_HEADING_TEXT = 'Trace';

/** The id of the link view's lead, which describes its heading so a screen reader hears the two ends. */
export const LINK_LEAD_ID = 'details-link-lead';

/** The id of the trace view's lead, which describes its heading so a screen reader hears the path's length. */
export const TRACE_LEAD_ID = 'details-trace-lead';

export const CLOSE_DETAILS_LABEL = 'Close details';

export const HINT_NUDGE_TEXT = 'Pick a package to end the trace';

export const HINT_CANCEL_TEXT = 'cancels';

export const ESC_KEY_TEXT = 'Esc';
