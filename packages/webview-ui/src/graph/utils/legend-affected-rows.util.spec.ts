import { describe, expect, it } from 'vitest';

import { affectedLegendRowsOf } from './legend-affected-rows.util.ts';
import { TASK_SWATCH } from '../common/legend-task.const.ts';
import type { LegendHalo, LegendSwatch } from '../common/legend.type.ts';

const CHANGED_HALO: LegendHalo = { colour: 'affected', opacity: 0.4 };

const DEPENDENCY_HALO: LegendHalo = { colour: 'affected', opacity: 0.18 };

const CHANGED_SWATCH: LegendSwatch = { ...TASK_SWATCH, halo: CHANGED_HALO };

const DEPENDENCY_SWATCH: LegendSwatch = { ...TASK_SWATCH, halo: DEPENDENCY_HALO };

describe('FEATURE: affectedLegendRowsOf', () => {
  it.each([['task'], ['package']] as const)('WHEN the level is %s THEN two rows carry the level in their text', (level) => {
    const rows = affectedLegendRowsOf(level);

    expect(rows.map((row): [string, string] => [row.id, row.text])).toStrictEqual([
      ['affected-changed', `Affected (${level} level)`],
      ['affected-dependency', `Affected via dependency (${level} level)`]
    ]);
  });

  describe('GIVEN the task level', () => {
    it('THEN the changed swatch is the task swatch with a 0.4 affected halo', () => {
      const [changed] = affectedLegendRowsOf('task');

      expect(changed?.swatch).toStrictEqual(CHANGED_SWATCH);
    });

    it('THEN the dependency swatch is the task swatch with a 0.18 affected halo', () => {
      const [, dependency] = affectedLegendRowsOf('task');

      expect(dependency?.swatch).toStrictEqual(DEPENDENCY_SWATCH);
    });
  });
});
