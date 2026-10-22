import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayoutRuns } from './graph-layout-runs.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import type { LayoutsRig } from '../test/common/graph-layouts.type.ts';
import { GROUPED_POSITIONS_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { isGroupedGraph, layoutsRigOf, resultOf } from '../test/utils/graph-layouts.spec.util.ts';

const GROUPED_RESULT: LayoutResult = resultOf('h1', GROUPED_POSITIONS_STUB);

describe('FEATURE: GraphLayoutRuns', () => {
  let rig: LayoutsRig;
  let runs: GraphLayoutRuns;

  beforeEach(() => {
    rig = layoutsRigOf();
    runs = new GraphLayoutRuns(rig.deps);
  });

  describe('GIVEN no graph drawn', () => {
    it('WHEN a run is asked THEN it answers null and the runner never runs', async () => {
      const result = await runs.run('flat');

      expect(result).toBeNull();
      expect(rig.runs.count()).toBe(0);
    });
  });

  describe('GIVEN a grouped run in flight', () => {
    let landed: Promise<LayoutResult | null>;

    beforeEach(() => {
      rig.setDrawn(STATE_STUB);
      landed = runs.run('folders');
    });

    it('THEN folders is running, flat is not, and the runner got the grouped graph', () => {
      expect(runs.isRunning('folders')).toBe(true);
      expect(runs.isRunning('flat')).toBe(false);
      expect(isGroupedGraph(rig.runs.graphOf(0))).toBe(true);
    });

    it('WHEN it lands THEN it answers the result and nothing is running', async () => {
      await rig.runs.settle(0, GROUPED_RESULT);

      expect(await landed).toStrictEqual(GROUPED_RESULT);
      expect(runs.isRunning('folders')).toBe(false);
    });

    it('WHEN a flat run replaces it and the dropped run settles THEN flat is still running', async () => {
      void runs.run('flat');
      await rig.runs.settle(0, null);

      expect(runs.isRunning('flat')).toBe(true);
    });

    it('WHEN the runs are forgotten THEN nothing is running', () => {
      runs.forget();

      expect(runs.isRunning('folders')).toBe(false);
    });
  });
});
