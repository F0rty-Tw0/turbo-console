import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InspectionCanvas } from './inspection-canvas.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { CanvasFolders, CanvasShown } from '../common/graph-inspection.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { BOARDS_DRAWN, BOARDS_NAMES, boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { pkg } from '../test/utils/inspections.spec.util.ts';

const UI_SHOWN: CanvasShown = {
  inspection: pkg('@acme/ui'),
  drawn: BOARDS_DRAWN,
  visible: new Set(BOARDS_NAMES),
  trace: null,
  candidates: null
};

describe('FEATURE: InspectionCanvas', () => {
  let paint: Mock<GraphView['paint']>;
  let setGhosts: Mock<GraphView['setGhosts']>;
  let show: Mock<CanvasFolders['show']>;
  let canvas: InspectionCanvas;

  const appsStateOfPaint = (call: number): ProbeState | undefined => paint.mock.calls[call]?.[0].collapsedState('apps');

  beforeEach(() => {
    const scene = (): FolderScene | null => boardsSceneOf(['apps']);

    paint = vi.fn<GraphView['paint']>();
    setGhosts = vi.fn<GraphView['setGhosts']>();
    show = vi.fn<CanvasFolders['show']>();
    canvas = new InspectionCanvas({ paint, setGhosts }, { scene, show });
  });

  describe('GIVEN ui inspected while apps is collapsed', () => {
    beforeEach(() => {
      canvas.draw(UI_SHOWN, false);
    });

    it('THEN the paint covers the folder scene: apps, which depends on ui, is highlighted', () => {
      expect(appsStateOfPaint(0)).toBe('highlighted');
    });

    it('THEN the folder pass runs once, after the ghosts', () => {
      const [ghostsOrder] = setGhosts.mock.invocationCallOrder;
      const [showOrder] = show.mock.invocationCallOrder;

      expect(show).toHaveBeenCalledOnce();
      expect(ghostsOrder).toBeLessThan(showOrder ?? 0);
    });

    it('WHEN it is repainted with no scene THEN apps paints normal and the folder pass does not run again', () => {
      canvas.repaint(null);

      expect(appsStateOfPaint(1)).toBe('normal');
      expect(show).toHaveBeenCalledOnce();
    });
  });

  it('GIVEN nothing drawn WHEN it is repainted THEN nothing is painted', () => {
    canvas.repaint(boardsSceneOf([]));

    expect(paint).not.toHaveBeenCalled();
  });
});
