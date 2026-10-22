// eslint-disable-next-line local/type-placement -- the id union derives from the list the spec checks against codicon.css, so the two cannot drift.
import type { GRAPH_ICON_IDS } from './graph-icon.const.ts';

export type GraphIconId = (typeof GRAPH_ICON_IDS)[number];
