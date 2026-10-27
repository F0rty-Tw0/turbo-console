import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { wireSashInput } from './graph-sash-input.ts';
import type { PanelSide } from '../common/graph-page.type.ts';
import { SASHING_CLASS, SASH_DRAGGING_CLASS } from '../common/graph.const.ts';
import type { SashResizer } from '../common/panel-sash.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const POINTER_ID = 7;

/** The body spans x 0 to 1000, so a Controls pointer at x is a width of x and a Details one 1000 - x. */
const BODY_RECT = { left: 0, right: 1000 };

type Resizer = {
  readonly resizer: SashResizer;
  readonly resize: Mock<(side: PanelSide, px: number) => void>;
  readonly commit: Mock<() => void>;
  readonly reset: Mock<(side: PanelSide) => void>;
};

const pointerOf = (type: string, props: object): Event => Object.assign(new Event(type), { pointerId: POINTER_ID }, props);

const keyOf = (key: string, props: object = {}): Event => Object.assign(new Event('keydown', { cancelable: true }), { key }, props);

/** A sash resizer whose drawn width starts at `width`: `resize` moves it, as the page's does while the width fits. */
const resizerMock = (width: number): Resizer => {
  const state = { width };
  const resize = vi.fn((_side: PanelSide, px: number): void => {
    state.width = px;
  });
  const commit = vi.fn<() => void>();
  const reset = vi.fn<(side: PanelSide) => void>();
  const resizer: SashResizer = { widthOf: (): number => state.width, maxOf: (): number => 580, resize, commit, reset };

  const mock: Resizer = { resizer, resize, commit, reset };

  return mock;
};

describe('FEATURE: wireSashInput', () => {
  let sash: HTMLElement;
  let body: HTMLElement;
  let held: Set<number>;
  let page: Resizer;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    held = new Set<number>();
    page = resizerMock(260);

    const capture = {
      setPointerCapture: (id: number): void => void held.add(id),
      hasPointerCapture: (id: number): boolean => held.has(id),
      releasePointerCapture: (id: number): void => void held.delete(id)
    };

    sash = Object.assign(document.createElement('div'), capture);
    body = Object.assign(document.createElement('div'), { getBoundingClientRect: () => BODY_RECT });
    wireSashInput('controls', sash, page.resizer, body);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a primary press on the sash', () => {
    beforeEach(() => {
      sash.dispatchEvent(pointerOf('pointerdown', { button: 0, clientX: 260 }));
    });

    it('WHEN the press lands THEN the sash holds the pointer and the drag classes are set', () => {
      expect(held.has(POINTER_ID)).toBe(true);
      expect(sash.classList.contains(SASH_DRAGGING_CLASS)).toBe(true);
      expect(body.classList.contains(SASHING_CLASS)).toBe(true);
    });

    it('WHEN the pointer moves THEN the Controls panel is resized to the pointer', () => {
      sash.dispatchEvent(pointerOf('pointermove', { clientX: 320 }));

      expect(page.resize).toHaveBeenCalledWith('controls', 320);
      expect(page.commit).not.toHaveBeenCalled();
    });

    describe('WHEN the pointer moves and the sash then loses the pointer', () => {
      beforeEach(() => {
        sash.dispatchEvent(pointerOf('pointermove', { clientX: 320 }));
        held.clear();
        sash.dispatchEvent(pointerOf('lostpointercapture', {}));
      });

      it('THEN the drag classes are gone', () => {
        expect(sash.classList.contains(SASH_DRAGGING_CLASS)).toBe(false);
        expect(body.classList.contains(SASHING_CLASS)).toBe(false);
      });

      it('THEN the widths are saved once', () => {
        expect(page.commit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN a press 2px right of where the panel edge is', () => {
    it('WHEN the pointer moves THEN the panel keeps that 2px and does not jump to the pointer', () => {
      sash.dispatchEvent(pointerOf('pointerdown', { button: 0, clientX: 262 }));
      sash.dispatchEvent(pointerOf('pointermove', { clientX: 300 }));

      expect(page.resize).toHaveBeenCalledWith('controls', 298);
    });
  });

  describe('GIVEN a press that never moves', () => {
    it('WHEN the sash loses the pointer THEN the classes are gone and nothing is saved', () => {
      sash.dispatchEvent(pointerOf('pointerdown', { button: 0, clientX: 260 }));
      held.clear();
      sash.dispatchEvent(pointerOf('lostpointercapture', {}));

      expect(body.classList.contains(SASHING_CLASS)).toBe(false);
      expect(page.commit).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a press with the secondary button', () => {
    it('WHEN it lands THEN the sash does not hold the pointer and sets no class', () => {
      sash.dispatchEvent(pointerOf('pointerdown', { button: 2, clientX: 260 }));

      expect(held.size).toBe(0);
      expect(sash.classList.contains(SASH_DRAGGING_CLASS)).toBe(false);
      expect(body.classList.contains(SASHING_CLASS)).toBe(false);
    });
  });

  describe('GIVEN no press', () => {
    it('WHEN the pointer moves over the sash THEN nothing is resized', () => {
      sash.dispatchEvent(pointerOf('pointermove', { clientX: 320 }));

      expect(page.resize).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the sash is focused', () => {
    it('WHEN an arrow key comes THEN the panel is resized, the key is handled and the width is saved', () => {
      const event = keyOf('ArrowRight');

      sash.dispatchEvent(event);

      expect(page.resize).toHaveBeenCalledWith('controls', 276);
      expect(page.commit).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('WHEN a key the sash does not handle comes THEN it is left alone', () => {
      const event = keyOf('Tab');

      sash.dispatchEvent(event);

      expect(page.resize).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('WHEN the sash is double-clicked THEN its side is reset', () => {
      sash.dispatchEvent(new Event('dblclick'));

      expect(page.reset).toHaveBeenCalledWith('controls');
    });
  });
});
