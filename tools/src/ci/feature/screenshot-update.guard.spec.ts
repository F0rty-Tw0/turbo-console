import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../../../../');
const FLAG = '--update-snapshots';
const GUARD = "github.event_name == 'workflow_dispatch' && inputs.update-snapshots";

const hasFlag = (line: string): boolean => line.includes(FLAG);

const isUnguarded = (line: string): boolean => !line.includes(GUARD);

const updateLinesOf = (ci: string): string[] => {
  const lines = ci.split('\n');

  return lines.filter(hasFlag);
};

/** Lines that pass the update flag without the dispatch guard on the same line, so a push or PR run could take them. */
const unguardedUpdateLinesOf = (ci: string): string[] => {
  const updates = updateLinesOf(ci);

  return updates.filter(isUnguarded);
};

const GUARDED = `run: screenshots \${{ (${GUARD}) && '--update-snapshots=all' || '' }}`;

describe('FEATURE: Screenshot update guard', () => {
  describe('GIVEN a workflow line whose update flag sits behind the dispatch guard', () => {
    it('WHEN the unguarded lines are read THEN the list is empty', () => {
      const result = unguardedUpdateLinesOf(GUARDED);

      expect(result).toStrictEqual([]);
    });
  });

  describe('GIVEN a workflow line with the update flag and no dispatch guard', () => {
    it('WHEN the unguarded lines are read THEN that line is listed', () => {
      const line = 'run: screenshots --update-snapshots=all';

      const result = unguardedUpdateLinesOf(line);

      expect(result).toStrictEqual([line]);
    });
  });

  describe('GIVEN the repo ci.yml', () => {
    it('WHEN its update flag lines are read THEN every one sits behind the dispatch guard', () => {
      const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
      const updates = updateLinesOf(ci);

      const result = unguardedUpdateLinesOf(ci);

      expect(updates.length).toBeGreaterThanOrEqual(1);
      expect(result).toStrictEqual([]);
    });
  });
});
