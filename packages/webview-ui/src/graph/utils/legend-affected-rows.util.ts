import type { GraphAffected } from '../../bridge/common/graph-affected.type.ts';
import { AFFECTED_UNDERLAY_OPACITY } from '../common/graph-task.const.ts';
import { AFFECTED_LEVEL_WORDS, TASK_SWATCH } from '../common/legend-task.const.ts';
import type { LegendHalo, LegendRow, LegendSwatch } from '../common/legend.type.ts';

const haloSwatchOf = (opacity: number): LegendSwatch => {
  const halo: LegendHalo = { colour: 'affected', opacity };
  const swatch: LegendSwatch = { ...TASK_SWATCH, halo };

  return swatch;
};

/** The two affected rows the task legend lists while the marks are on, worded for the root's `level`. */
export const affectedLegendRowsOf = (level: GraphAffected['mode']): LegendRow[] => {
  const words = AFFECTED_LEVEL_WORDS[level];
  const changedSwatch = haloSwatchOf(AFFECTED_UNDERLAY_OPACITY.changed);
  const dependencySwatch = haloSwatchOf(AFFECTED_UNDERLAY_OPACITY.dependency);
  const changed: LegendRow = { id: 'affected-changed', text: `Affected (${words})`, swatch: changedSwatch };
  const dependency: LegendRow = { id: 'affected-dependency', text: `Affected via dependency (${words})`, swatch: dependencySwatch };

  return [changed, dependency];
};
