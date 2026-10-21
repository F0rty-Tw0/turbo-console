import { describe, expect, it } from 'vitest';

import { restorePlanOf } from './view-restore.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestorePlan } from '../common/restore-plan.type.ts';

const PAN: Position = { x: -10, y: 20 };

const SAVED: GraphViewState = { hash: 'h1', zoom: 1.5, pan: PAN, selected: 'web' };

const PACKAGES = ['web', 'api'];

const WITHOUT_WEB = ['api'];

describe('FEATURE: restorePlanOf', () => {
  it('GIVEN no saved state WHEN a graph is placed THEN it is fitted with no selection', () => {
    const expected: RestorePlan = { kind: 'fit', selected: null };

    const plan = restorePlanOf(null, 'h1', PACKAGES);

    expect(plan).toStrictEqual(expected);
  });

  describe('GIVEN a saved state for the same hash', () => {
    it('WHEN the selection is still drawn THEN the camera and the selection are restored', () => {
      const expected: RestorePlan = { kind: 'restore', zoom: 1.5, pan: PAN, selected: 'web' };

      const plan = restorePlanOf(SAVED, 'h1', PACKAGES);

      expect(plan).toStrictEqual(expected);
    });

    it('WHEN the selection is not drawn THEN the camera is restored with no selection', () => {
      const expected: RestorePlan = { kind: 'restore', zoom: 1.5, pan: PAN, selected: null };

      const plan = restorePlanOf(SAVED, 'h1', WITHOUT_WEB);

      expect(plan).toStrictEqual(expected);
    });
  });

  describe('GIVEN a saved state for another hash', () => {
    it('WHEN the selection is still drawn THEN the graph is fitted and the selection kept', () => {
      const expected: RestorePlan = { kind: 'fit', selected: 'web' };

      const plan = restorePlanOf(SAVED, 'h2', PACKAGES);

      expect(plan).toStrictEqual(expected);
    });

    it('WHEN the selection is gone THEN the graph is fitted with no selection', () => {
      const expected: RestorePlan = { kind: 'fit', selected: null };

      const plan = restorePlanOf(SAVED, 'h2', WITHOUT_WEB);

      expect(plan).toStrictEqual(expected);
    });
  });
});
