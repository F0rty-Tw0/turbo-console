import type { Mocked } from 'vitest';
import { vi } from 'vitest';

import type { LayoutScreen, LayoutView } from '../../common/graph-layouts.type.ts';

export const layoutScreenMock = (): Mocked<LayoutScreen> => {
  const screen: Mocked<LayoutScreen> = {
    showLoading: vi.fn<LayoutScreen['showLoading']>(),
    showGraph: vi.fn<LayoutScreen['showGraph']>(),
    showNotice: vi.fn<LayoutScreen['showNotice']>()
  };

  return screen;
};

export const layoutViewMock = (): Mocked<LayoutView> => {
  const view: Mocked<LayoutView> = {
    setGraph: vi.fn<LayoutView['setGraph']>(),
    setGrouping: vi.fn<LayoutView['setGrouping']>(),
    setPositions: vi.fn<LayoutView['setPositions']>(),
    fit: vi.fn<LayoutView['fit']>(),
    resize: vi.fn<LayoutView['resize']>()
  };

  return view;
};
