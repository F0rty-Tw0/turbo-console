import type { FolderPaint, FolderPaintRow } from '../../common/graph-folders.type.ts';

const UI = '@acme/ui';

const UTILS = '@acme/utils';

const LINK_UI = `apps>${UI}`;

const LINK_UTILS = `apps>${UTILS}`;

const NORMAL_FOLDERS = { apps: 'normal', packages: 'normal' } as const;

const DIMMED_APPS = { apps: 'dimmed', packages: 'normal' } as const;

const HIGHLIGHTED_APPS = { apps: 'highlighted', packages: 'normal' } as const;

const NORMAL_LINKS = { [LINK_UI]: 'normal', [LINK_UTILS]: 'normal' } as const;

const DIMMED_LINKS = { [LINK_UI]: 'dimmed', [LINK_UTILS]: 'dimmed' } as const;

const HIGHLIGHTED_LINKS = { [LINK_UI]: 'highlighted', [LINK_UTILS]: 'highlighted' } as const;

const NORMAL: FolderPaint = { folders: NORMAL_FOLDERS, links: NORMAL_LINKS };

const SELECTED_UI: FolderPaint = { folders: HIGHLIGHTED_APPS, links: HIGHLIGHTED_LINKS };

const DIMMED: FolderPaint = { folders: DIMMED_APPS, links: DIMMED_LINKS };

const SELECT_UI = { selected: UI };

const SELECT_CONFIG = { selected: '@acme/config' };

const UI_TO_UTILS = { source: UI, target: UTILS };

const UI_TRACED_TO_UTILS = { start: UI, end: UTILS };

const LINK_UI_UTILS = { link: UI_TO_UTILS };

const TRACE_UI_UTILS = { trace: UI_TRACED_TO_UTILS };

/** Each state a collapsed `apps` and an expanded `packages` take under one saved inspection (spec §4.4). */
export const FOLDER_PAINT_ROWS_STUB: FolderPaintRow[] = [
  { name: 'nothing inspected', saved: {}, collapsed: ['apps'], paint: NORMAL },
  { name: 'ui selected', saved: SELECT_UI, collapsed: ['apps'], paint: SELECTED_UI },
  { name: 'config selected', saved: SELECT_CONFIG, collapsed: ['apps'], paint: DIMMED },
  { name: 'the link from ui to utils inspected', saved: LINK_UI_UTILS, collapsed: ['apps'], paint: DIMMED },
  { name: 'a trace from ui to utils', saved: TRACE_UI_UTILS, collapsed: ['apps'], paint: DIMMED }
];

/** What config selected and then Start trace pressed leaves: the picking view paints like the selection did. */
export const PICKING_PAINT_ROW_STUB: FolderPaintRow = {
  name: 'config selected and a trace being picked',
  saved: SELECT_CONFIG,
  collapsed: ['apps'],
  paint: DIMMED
};

/** `apps` dimmed by a selection elsewhere, expanded, so no folder link is drawn. */
export const DIMMED_BOX_PAINT_STUB: FolderPaint = { folders: DIMMED_APPS, links: {} };

/** Both folders expanded and nothing inspected. */
export const NORMAL_BOXES_PAINT_STUB: FolderPaint = { folders: NORMAL_FOLDERS, links: {} };
