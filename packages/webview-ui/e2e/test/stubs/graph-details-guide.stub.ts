import type { GuideLine } from '../../common/graph.type.ts';

export const EMPTY_LEAD_STUB: string = 'Select a package or a link to see its facts here.';

const LINK_TEXT: string =
  "Click an arrow to see the package.json entry behind it. From the keyboard, use Explain in a package's lists.";

const PACKAGE_LINE: GuideLine = {
  icon: 'package',
  name: 'A package',
  text: 'Click it on the graph, or press Enter on its name in Controls.'
};

const LINK_LINE: GuideLine = { icon: 'arrow-right', name: 'A link', text: LINK_TEXT };

const TRACE_LINE: GuideLine = {
  icon: 'git-commit',
  name: 'A path between two',
  text: 'Select a package, choose Start trace, then pick the other end.'
};

/** The empty view's three ways in, copied from the spec: the page's own constants must not vouch for themselves. */
export const GUIDE_STUB: GuideLine[] = [PACKAGE_LINE, LINK_LINE, TRACE_LINE];

export const GUIDE_FOOTER_STUB: string = 'Esc on the graph clears what you selected.';

/** The key names the empty view draws as `kbd`, in reading order. */
export const GUIDE_KEYS_STUB: string[] = ['Enter', 'Esc'];
