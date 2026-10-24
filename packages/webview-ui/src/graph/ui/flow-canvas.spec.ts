import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { fitFlowCanvas } from './flow-canvas.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

type PenSpy = {
  readonly setTransform: Mock<CanvasRenderingContext2D['setTransform']>;
};

const BOX = { offsetLeft: 10, offsetTop: 20, offsetWidth: 300, offsetHeight: 150 };

describe('FEATURE: fitFlowCanvas', () => {
  let pen: PenSpy;
  let canvas: HTMLCanvasElement;
  let container: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    vi.stubGlobal('window', { devicePixelRatio: 2 });

    const getContext = (): PenSpy => pen;

    pen = { setTransform: vi.fn<CanvasRenderingContext2D['setTransform']>() };
    canvas = Object.assign(document.createElement('canvas'), { getContext });
    container = Object.assign(document.createElement('div'), BOX);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a 300 by 150 container at 10, 20 and a device pixel ratio of 2', () => {
    beforeEach(() => {
      fitFlowCanvas(canvas, container);
    });

    it('WHEN the canvas is fitted THEN its CSS box is the container box', () => {
      expect(canvas.style).toMatchObject({ left: '10px', top: '20px', width: '300px', height: '150px' });
    });

    it('WHEN the canvas is fitted THEN its bitmap is twice the CSS size', () => {
      expect(canvas.width).toBe(600);
      expect(canvas.height).toBe(300);
    });

    it('WHEN the canvas is fitted THEN the pen is scaled by 2 so it draws in CSS pixels', () => {
      expect(pen.setTransform).toHaveBeenCalledExactlyOnceWith(2, 0, 0, 2, 0, 0);
    });
  });
});
