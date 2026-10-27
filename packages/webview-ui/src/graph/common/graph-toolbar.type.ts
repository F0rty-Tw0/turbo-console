import type { PageElements } from './graph-page.type.ts';

/** What `buildToolbar` builds: the toolbar and the parts of it the page drives. */
export type ToolbarElements = Pick<
  PageElements,
  | 'toolbar'
  | 'packagesMode'
  | 'taskMode'
  | 'controls'
  | 'details'
  | 'fit'
  | 'relayout'
  | 'exportImage'
  | 'clear'
  | 'status'
  | 'filtersOn'
>;
