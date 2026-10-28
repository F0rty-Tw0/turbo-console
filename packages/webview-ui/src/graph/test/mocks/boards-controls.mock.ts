import type { ControlsElements } from '../../common/controls-elements.type.ts';
import type { PageElements } from '../../common/graph-page.type.ts';
import { buildControls } from '../../ui/controls-elements.ts';
import { BOARDS_GROUPS_STUB } from '../stubs/folder-boards.stub.ts';

/** The Controls panel of the boards graph (apps, packages) with the tag `app`, built on the stubbed `document`. */
export const boardsControlsMock = (): ControlsElements => buildControls(BOARDS_GROUPS_STUB, ['app']);

/** The toolbar's Controls button and its "filters on" mark, built on the stubbed `document`. */
export const controlsTogglesMock = (): Pick<PageElements, 'controls' | 'filtersOn'> => {
  const toggles: Pick<PageElements, 'controls' | 'filtersOn'> = {
    controls: document.createElement('button'),
    filtersOn: document.createElement('span')
  };

  return toggles;
};
