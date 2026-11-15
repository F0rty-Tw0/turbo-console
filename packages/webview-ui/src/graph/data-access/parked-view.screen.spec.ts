import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it } from 'vitest';

import { parkedScreenOf } from './parked-view.ts';
import type { LayoutScreen } from '../common/graph-layouts.type.ts';
import { FALLBACK_NOTICE } from '../common/graph.const.ts';
import { layoutScreenMock } from '../test/mocks/graph-layouts.mock.ts';

type ScreenCall = (screen: LayoutScreen) => void;

const SCREEN_CALLS: [keyof LayoutScreen, ScreenCall][] = [
  ['showLoading', (screen: LayoutScreen): void => screen.showLoading()],
  ['showGraph', (screen: LayoutScreen): void => screen.showGraph(false)],
  ['showNotice', (screen: LayoutScreen): void => screen.showNotice(FALLBACK_NOTICE)]
];

describe('FEATURE: parkedScreenOf', () => {
  let inner: Mocked<LayoutScreen>;
  let isParked: boolean;
  let screen: LayoutScreen;

  beforeEach(() => {
    inner = layoutScreenMock();
    isParked = true;
    screen = parkedScreenOf(inner, (): boolean => isParked);
  });

  describe('GIVEN the screen is parked', () => {
    it.each(SCREEN_CALLS)('WHEN %s is called THEN the inner screen never hears of it', (name, call) => {
      call(screen);

      expect(inner[name]).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the screen is not parked', () => {
    it.each(SCREEN_CALLS)('WHEN %s is called THEN the inner screen does it', (name, call) => {
      isParked = false;
      call(screen);

      expect(inner[name]).toHaveBeenCalledOnce();
    });
  });
});
