import type { LegendElements } from './legend.type.ts';
import type { PageElements } from './page-elements.type.ts';

/** What `buildToolbar` builds: the toolbar and the parts of it the page drives. */
export type ToolbarElements = Pick<
  PageElements,
  | 'toolbar'
  | 'modeGroup'
  | 'modeEnd'
  | 'packagesMode'
  | 'taskMode'
  | 'controls'
  | 'details'
  | 'fit'
  | 'relayout'
  | 'exportImage'
  | 'status'
  | 'filtersOn'
> &
  LegendElements;
