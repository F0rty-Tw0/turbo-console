import { describe, expect, it } from 'vitest';

import { GraphPackageRuns } from './graph-package-runs.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import { graphViewMock } from '../test/mocks/graph-view.mock.ts';
import { WEB_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';
import { HOME_CAMERA_STUB } from '../test/stubs/layout.stub.ts';

const TASKS: GraphTask[] = [WEB_BUILD_STUB];

const mapOf = (state: GraphRunState): Map<string, GraphRunState> => {
  const runs = new Map<string, GraphRunState>([['web', state]]);

  return runs;
};

describe('FEATURE: GraphPackageRuns', () => {
  describe('GIVEN web#build listed', () => {
    it('WHEN runs say web#build running THEN setPackageRuns gets web running', () => {
      const view = graphViewMock(HOME_CAMERA_STUB);
      const marks = new GraphPackageRuns(view);

      marks.listed(TASKS);
      marks.runs({ 'web#build': 'running' });

      expect(view.setPackageRuns).toHaveBeenLastCalledWith(mapOf('running'));
    });
  });

  describe('GIVEN runs for web#build that came before the first state', () => {
    it('WHEN the tasks are listed after them THEN setPackageRuns gets web running', () => {
      const view = graphViewMock(HOME_CAMERA_STUB);
      const marks = new GraphPackageRuns(view);

      marks.runs({ 'web#build': 'running' });
      marks.listed(TASKS);

      expect(view.setPackageRuns).toHaveBeenLastCalledWith(mapOf('running'));
    });
  });

  describe('GIVEN marked runs', () => {
    it('WHEN mark is called again THEN setPackageRuns gets an equal map', () => {
      const view = graphViewMock(HOME_CAMERA_STUB);
      const marks = new GraphPackageRuns(view);

      marks.listed(TASKS);
      marks.runs({ 'web#build': 'running' });
      marks.mark();

      expect(view.setPackageRuns).toHaveBeenCalledTimes(3);
      expect(view.setPackageRuns).toHaveBeenLastCalledWith(mapOf('running'));
    });
  });

  describe('GIVEN web#build running', () => {
    it('WHEN a later runs map has no web#build THEN setPackageRuns gets an empty map', () => {
      const view = graphViewMock(HOME_CAMERA_STUB);
      const marks = new GraphPackageRuns(view);

      marks.listed(TASKS);
      marks.runs({ 'web#build': 'running' });
      marks.runs({});

      expect(view.setPackageRuns).toHaveBeenLastCalledWith(new Map());
    });
  });
});
