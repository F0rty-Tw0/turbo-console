import type { ProbeState } from './graph-probe.type.ts';
import type { FolderPaint } from './paint.type.ts';

/** Every box, collapsed folder and folder link normal: no inspection, or no folder scene. */
export const NORMAL_FOLDER_PAINT: FolderPaint = {
  boxState: (): ProbeState => 'normal',
  collapsedState: (): ProbeState => 'normal',
  folderLinkState: (): ProbeState => 'normal'
};
