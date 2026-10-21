import { CONTROLS_FILTERED_LABEL, CONTROLS_LABEL, ROOT_FOLDER } from '../common/graph.const.ts';

/** The folder as a group title; `''` is the root folder, and a real folder named like it gets `./` so the two differ. */
export const folderTitleOf = (folder: string): string => {
  if (folder === '') return ROOT_FOLDER;

  if (folder === ROOT_FOLDER) return `./${folder}`;

  return folder;
};

export const groupLabelOf = (folder: string, total: number): string => `${folder} (${total})`;

export const countTextOf = (visible: number, total: number): string => `Showing ${visible} of ${total} packages`;

export const controlsLabelOf = (isFiltered: boolean): string => {
  if (isFiltered) return CONTROLS_FILTERED_LABEL;

  return CONTROLS_LABEL;
};

export const showLabelOf = (name: string): string => `Show ${name}`;

export const focusLabelOf = (name: string): string => `Focus ${name}`;
