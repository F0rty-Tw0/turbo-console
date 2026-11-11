import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphLegend } from './graph-legend.ts';
import type { GraphAffected } from '../../bridge/common/graph-affected.type.ts';
import type { LegendRender } from '../common/legend.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { HOST_GRAPH_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { THEME_COLORS_STUB } from '../test/stubs/theme-colors.stub.ts';

const COLORS = THEME_COLORS_STUB;

const NEXT_COLORS: ThemeColors = { ...THEME_COLORS_STUB, affected: '#123456' };

const SHOWN_STATE = { ...HOST_GRAPH_STUB, affectedShown: true };

const STATE_ON = { type: 'state', state: SHOWN_STATE };

const STATE_OFF = { type: 'state', state: HOST_GRAPH_STUB };

const LOADING_STATE = { kind: 'loading' };

const STATE_LOADING = { type: 'state', state: LOADING_STATE };

const TASKS: GraphAffected['tasks'] = { 'app#build': 'changed' };

const TASK_AFFECTED: GraphAffected = { mode: 'task', tasks: TASKS };

const PACKAGE_AFFECTED: GraphAffected = { mode: 'package', tasks: TASKS };

const MALFORMED = { mode: 'loud', tasks: TASKS };

const RUNS_WITHOUT_KEY = { type: 'runs', runs: {} };

const runsOf = (affected: unknown): Record<string, unknown> => {
  const message = { ...RUNS_WITHOUT_KEY, affected };

  return message;
};

describe('FEATURE: GraphLegend', () => {
  let render: Mock<LegendRender>;
  let legend: GraphLegend;

  beforeEach(() => {
    render = vi.fn<LegendRender>();
    legend = new GraphLegend(render);
  });

  describe('GIVEN the legend is themed', () => {
    beforeEach(() => {
      legend.themed(COLORS);
    });

    it('WHEN nothing else arrived THEN render ran once with the colors and no level', () => {
      expect(render).toHaveBeenCalledExactlyOnceWith(COLORS, null);
    });

    it.each([
      ['a value that is not a host message', 42],
      ['a loading state', STATE_LOADING],
      ['a showPackage message', { type: 'showPackage', name: 'app' }]
    ])('WHEN %s arrives THEN nothing more renders', (_name, message) => {
      legend.received(message);

      expect(render).toHaveBeenCalledOnce();
    });

    it('WHEN runs carry an affected object while the toggle is off THEN nothing more renders', () => {
      legend.received(runsOf(TASK_AFFECTED));

      expect(render).toHaveBeenCalledOnce();
    });

    it('WHEN a state with the toggle off arrives THEN nothing more renders', () => {
      legend.received(STATE_OFF);

      expect(render).toHaveBeenCalledOnce();
    });

    it('WHEN it is themed with the same colors object THEN nothing more renders', () => {
      legend.themed(COLORS);

      expect(render).toHaveBeenCalledOnce();
    });

    it('WHEN it is themed with a new colors object THEN render runs again with them', () => {
      legend.themed(NEXT_COLORS);

      expect(render).toHaveBeenLastCalledWith(NEXT_COLORS, null);
    });

    describe('GIVEN a graph state with the affected toggle on', () => {
      beforeEach(() => {
        legend.received(STATE_ON);
      });

      it.each([
        ['task', TASK_AFFECTED],
        ['package', PACKAGE_AFFECTED]
      ])('WHEN runs carry a %s mode object THEN render ran with that level', (level, affected) => {
        legend.received(runsOf(affected));

        expect(render).toHaveBeenLastCalledWith(COLORS, level);
      });

      it('WHEN runs carry the same level again THEN nothing more renders', () => {
        legend.received(runsOf(TASK_AFFECTED));
        legend.received(runsOf(TASK_AFFECTED));

        expect(render).toHaveBeenCalledTimes(2);
      });

      it('WHEN runs carry affected null after an object THEN render ran with no level', () => {
        legend.received(runsOf(TASK_AFFECTED));
        legend.received(runsOf(null));

        expect(render).toHaveBeenLastCalledWith(COLORS, null);
      });

      it.each([
        ['no affected key', RUNS_WITHOUT_KEY],
        ['a malformed affected', runsOf(MALFORMED)]
      ])('WHEN runs with %s follow an object THEN the level is kept', (_name, message) => {
        legend.received(runsOf(TASK_AFFECTED));
        legend.received(message);

        expect(render).toHaveBeenLastCalledWith(COLORS, 'task');
      });

      it('WHEN a state with the toggle off arrives THEN render ran with no level', () => {
        legend.received(runsOf(TASK_AFFECTED));
        legend.received(STATE_OFF);

        expect(render).toHaveBeenLastCalledWith(COLORS, null);
      });

      it('WHEN the toggle goes off and on again THEN the level returns', () => {
        legend.received(runsOf(TASK_AFFECTED));
        legend.received(STATE_OFF);
        legend.received(STATE_ON);

        expect(render).toHaveBeenLastCalledWith(COLORS, 'task');
      });

      it('WHEN the theme changes THEN render ran with the new colors and the level', () => {
        legend.received(runsOf(TASK_AFFECTED));
        legend.themed(NEXT_COLORS);

        expect(render).toHaveBeenLastCalledWith(NEXT_COLORS, 'task');
      });
    });
  });

  describe('GIVEN the legend is not themed yet', () => {
    beforeEach(() => {
      legend.received(STATE_ON);
      legend.received(runsOf(TASK_AFFECTED));
    });

    it('WHEN a state and runs arrived THEN render has not run', () => {
      expect(render).not.toHaveBeenCalled();
    });

    it('WHEN it is themed THEN render ran with the level they set', () => {
      legend.themed(COLORS);

      expect(render).toHaveBeenCalledExactlyOnceWith(COLORS, 'task');
    });
  });
});
