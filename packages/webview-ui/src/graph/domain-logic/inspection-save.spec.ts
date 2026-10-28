import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { scheduleSave } from './inspection-save.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphInspectionDeps, InspectionSave } from '../common/graph-inspection.type.ts';
import type { ControlsViewFields, DrawnGraph, GraphView, PackageSaver, Viewport } from '../common/graph-page.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import { graphViewMock } from '../test/mocks/graph-view.mock.ts';

type SaveDeps = Pick<GraphInspectionDeps, 'drawn' | 'view' | 'controls' | 'saver'>;

const PAN: Position = { x: 1, y: 2 };

const CAMERA: Viewport = { zoom: 2, pan: PAN };

const DRAWN: DrawnGraph = { hash: 'h1', packages: [], infos: [], edges: [] };

const CONTROLS: ControlsViewFields = {
  controlsOpen: false,
  search: '',
  depth: 0,
  hidden: [],
  focus: null,
  tags: [],
  grouped: false,
  collapsed: []
};

const SHOWN: InspectionSave = { inspection: NO_INSPECTION, detailsOpen: false };

describe('FEATURE: scheduleSave', () => {
  let view: Mocked<GraphView>;
  let saver: Mocked<PackageSaver>;
  let deps: SaveDeps;

  beforeEach(() => {
    view = graphViewMock(CAMERA);
    saver = { schedule: vi.fn<PackageSaver['schedule']>(), flush: vi.fn<PackageSaver['flush']>() };
    deps = { drawn: (): DrawnGraph => DRAWN, view, controls: (): ControlsViewFields => CONTROLS, saver };
  });

  it.each([true, false])(
    'GIVEN a drawn graph WHEN a save is scheduled while isFitted is %s THEN the state keeps it',
    (fitted: boolean) => {
      view.isFitted.mockReturnValue(fitted);

      scheduleSave(deps, SHOWN);

      expect(saver.schedule).toHaveBeenCalledWith(expect.objectContaining({ hash: 'h1', ...CAMERA, fitted }));
    }
  );
});
