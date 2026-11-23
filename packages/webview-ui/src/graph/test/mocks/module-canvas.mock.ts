import type { Mocked } from 'vitest';
import { vi } from 'vitest';

import type { ModuleCanvas } from '../../common/module-canvas.type.ts';

/** Every canvas method a spy; nothing is drawn or chosen, so `selected`, `kindOf` and `renderedCentre` answer `null`. */
export const moduleCanvasMock = (): Mocked<ModuleCanvas> => {
  const canvas: Mocked<ModuleCanvas> = {
    show: vi.fn<ModuleCanvas['show']>(),
    clear: vi.fn<ModuleCanvas['clear']>(),
    paint: vi.fn<ModuleCanvas['paint']>(),
    selected: vi.fn<ModuleCanvas['selected']>(() => null),
    kindOf: vi.fn<ModuleCanvas['kindOf']>(() => null),
    renderedCentre: vi.fn<ModuleCanvas['renderedCentre']>(() => null)
  };

  return canvas;
};
