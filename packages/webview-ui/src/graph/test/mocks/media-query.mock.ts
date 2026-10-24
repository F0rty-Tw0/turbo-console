import { vi } from 'vitest';

import type { SwitchableMediaQueryMock } from '../common/media-query.type.ts';

/** A media query fixed at `matches`, every listener call a spy. */
export const mediaQueryMock = (matches: boolean): MediaQueryList => {
  const query: MediaQueryList = {
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true)
  };

  return query;
};

/** A media query starting at `matches` whose `change` listeners run on each `flip`. */
export const switchableMediaQueryMock = (matches: boolean): SwitchableMediaQueryMock => {
  const state = { matches };
  const target = new EventTarget();
  const addEventListener = target.addEventListener.bind(target);
  const query: MediaQueryList = {
    get matches(): boolean {
      return state.matches;
    },
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(addEventListener),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true)
  };
  const flip = (next: boolean): void => {
    state.matches = next;
    target.dispatchEvent(new Event('change'));
  };
  const mock: SwitchableMediaQueryMock = { query, flip };

  return mock;
};
