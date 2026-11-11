import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { affectedViewOf } from './affected-view.util.ts';
import type { AffectedMark, AffectedView } from '../common/affected.type.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';
import { predictionModelOf, turboTaskOf } from '../test/utils/prediction-model.spec.util.ts';

const NOW = new Date(2026, 10, 11, 14, 5).getTime();

const FILE_ROW: [string, string, string] = ['@fx/a#build', 'TaskFileChanged', 'packages/a/src/x.ts'];

const marksOf = (model: WorkspaceModel, rows: [string, string, string?][]): [string, AffectedMark][] => {
  const view = affectedViewOf(affectedResultOf(rows), model, NOW);
  const entries = Array.from(view.tasks);
  const marks = entries.map(([id, entry]): [string, AffectedMark] => [id, entry.mark]);

  return marks;
};

const idsOf = (view: AffectedView): string[] => {
  const keys = view.tasks.keys();
  const ids = Array.from(keys);

  return ids.sort();
};

const abModel = (): WorkspaceModel => {
  const packages = {
    '@fx/a': [turboTaskOf('@fx/a', 'build'), turboTaskOf('@fx/a', 'test')],
    '@fx/b': [turboTaskOf('@fx/b', 'lint')]
  };

  return predictionModelOf(packages);
};

describe('FEATURE: affected view', () => {
  describe('GIVEN a kept task', () => {
    it('WHEN the view is built THEN its entry holds the mark and the full line', () => {
      const model = predictionModelOf({ '@fx/a': [turboTaskOf('@fx/a', 'build')] });
      const result = affectedResultOf([FILE_ROW]);

      expect(affectedViewOf(result, model, NOW)).toStrictEqual({
        settledAt: NOW,
        mode: 'task',
        tasks: new Map([
          ['@fx/a#build', { mark: 'changed', line: 'Affected (task level): file changed, packages/a/src/x.ts (as of 14:05)' }]
        ])
      });
    });

    it('WHEN mode is "package" THEN the line names "package level" and the view keeps the mode', () => {
      const model = predictionModelOf({ '@fx/a': [turboTaskOf('@fx/a', 'build')] });
      const view = affectedViewOf(affectedResultOf([FILE_ROW], 'package'), model, NOW);

      expect(view.mode).toBe('package');
      expect(view.tasks.get('@fx/a#build')?.line).toBe('Affected (package level): file changed, packages/a/src/x.ts (as of 14:05)');
    });

    it('WHEN rows come in any order THEN every entry is keyed by its id', () => {
      const rows: [string, string][] = [
        ['@fx/b#lint', 'TaskFileChanged'],
        ['@fx/a#test', 'TaskFileChanged'],
        ['@fx/a#build', 'TaskFileChanged']
      ];
      const view = affectedViewOf(affectedResultOf(rows), abModel(), NOW);

      expect(idsOf(view)).toStrictEqual(['@fx/a#build', '@fx/a#test', '@fx/b#lint']);
    });

    it('WHEN there are no rows THEN the tasks map is empty and settledAt and mode carry over', () => {
      const view = affectedViewOf(affectedResultOf([]), abModel(), NOW);

      expect(view).toStrictEqual({ settledAt: NOW, mode: 'task', tasks: new Map() });
    });
  });

  describe('GIVEN rows the tree does not draw', () => {
    it('WHEN a carrier id, an atom-file task, a package the model lacks and a kept task are rows THEN only the kept task stays', () => {
      const model = atomModelOf(['tests/a.spec.ts']);
      const rows: [string, string][] = [
        ['@fx/e2e#e2e-ci', 'TaskFileChanged'],
        ['@fx/e2e#e2e-ci--tests/a.spec.ts', 'TaskFileChanged'],
        ['@fx/e2e#carrier', 'TaskFileChanged'],
        ['@fx/ghost#build', 'TaskFileChanged']
      ];

      const view = affectedViewOf(affectedResultOf(rows), model, NOW);

      expect(idsOf(view)).toStrictEqual(['@fx/e2e#e2e-ci']);
    });

    it('WHEN the model is single-package (package "//") and the id is "//#build" THEN it is kept', () => {
      const model = predictionModelOf({ '//': [turboTaskOf('//', 'build')] }, true);

      expect(marksOf(model, [['//#build', 'TaskFileChanged']])).toStrictEqual([['//#build', 'changed']]);
    });

    it('WHEN a monorepo root task in model.rootPackage ("//#lint") is a row THEN it is dropped', () => {
      const rootPackage: PackageNode = { name: '//', path: '.', label: null, tags: [], tasks: [turboTaskOf('//', 'lint')] };
      const base = abModel();
      const model: WorkspaceModel = { ...base, rootPackage };

      expect(marksOf(model, [['//#lint', 'TaskFileChanged']])).toStrictEqual([]);
    });
  });

  describe('GIVEN the same-package rule', () => {
    it('WHEN @fx/a#build is TaskFileChanged and @fx/a#test TaskAllChanged THEN both are "changed"', () => {
      const rows: [string, string][] = [
        ['@fx/a#build', 'TaskFileChanged'],
        ['@fx/a#test', 'TaskAllChanged']
      ];

      expect(marksOf(abModel(), rows)).toStrictEqual([
        ['@fx/a#build', 'changed'],
        ['@fx/a#test', 'changed']
      ]);
    });

    it('WHEN @fx/b#lint is TaskAllChanged alone in its package THEN it is "dependency"', () => {
      expect(marksOf(abModel(), [['@fx/b#lint', 'TaskAllChanged']])).toStrictEqual([['@fx/b#lint', 'dependency']]);
    });

    it('WHEN the only file-reason sibling is an atom-file task of the package THEN the plain TaskAllChanged task is "dependency"', () => {
      const atomFile = turboTaskOf('@fx/a', 'e2e-ci--x.spec.ts', { kind: 'atom-file' });
      const model = predictionModelOf({ '@fx/a': [atomFile, turboTaskOf('@fx/a', 'build')] });
      const rows: [string, string][] = [
        ['@fx/a#e2e-ci--x.spec.ts', 'TaskFileChanged'],
        ['@fx/a#build', 'TaskAllChanged']
      ];

      expect(marksOf(model, rows)).toStrictEqual([['@fx/a#build', 'dependency']]);
    });

    it('WHEN the only file-reason sibling id is not in the model THEN the TaskAllChanged task is "dependency"', () => {
      const rows: [string, string][] = [
        ['@fx/a#carrier', 'TaskFileChanged'],
        ['@fx/a#build', 'TaskAllChanged']
      ];

      expect(marksOf(abModel(), rows)).toStrictEqual([['@fx/a#build', 'dependency']]);
    });

    it('WHEN the file-reason sibling is in another package THEN it does not count', () => {
      const rows: [string, string][] = [
        ['@fx/a#build', 'TaskFileChanged'],
        ['@fx/b#lint', 'TaskAllChanged']
      ];

      expect(marksOf(abModel(), rows)).toStrictEqual([
        ['@fx/a#build', 'changed'],
        ['@fx/b#lint', 'dependency']
      ]);
    });

    it('WHEN @fx/lib#build is "required by an affected task" and @fx/app#build is TaskFileChanged THEN lib is "dependency" with the description in its line', () => {
      const model = predictionModelOf({ '@fx/lib': [turboTaskOf('@fx/lib', 'build')], '@fx/app': [turboTaskOf('@fx/app', 'build')] });
      const rows: [string, string, string][] = [
        ['@fx/lib#build', 'TaskAllChanged', 'required by an affected task'],
        ['@fx/app#build', 'TaskFileChanged', 'packages/app/src/x.ts']
      ];
      const view = affectedViewOf(affectedResultOf(rows), model, NOW);

      expect(view.tasks.get('@fx/lib#build')).toStrictEqual({
        mark: 'dependency',
        line: 'Affected (task level): required by an affected task (as of 14:05)'
      });
    });

    it('WHEN an umbrella has TaskFileChanged and a TaskAllChanged task shares its package THEN the umbrella reads "dependency" and the other "changed"', () => {
      const umbrella = turboTaskOf('@fx/a', 'e2e-ci', { kind: 'atom-umbrella' });
      const model = predictionModelOf({ '@fx/a': [umbrella, turboTaskOf('@fx/a', 'build')] });
      const rows: [string, string][] = [
        ['@fx/a#e2e-ci', 'TaskFileChanged'],
        ['@fx/a#build', 'TaskAllChanged']
      ];

      expect(marksOf(model, rows)).toStrictEqual([
        ['@fx/a#e2e-ci', 'dependency'],
        ['@fx/a#build', 'changed']
      ]);
    });

    it('WHEN rows are the umbrella and its file task THEN the umbrella is "dependency" and the file task is dropped', () => {
      const rows: [string, string][] = [
        ['@fx/e2e#e2e-ci', 'TaskFileChanged'],
        ['@fx/e2e#e2e-ci--tests/a.spec.ts', 'TaskFileChanged']
      ];

      expect(marksOf(atomModelOf(['tests/a.spec.ts']), rows)).toStrictEqual([['@fx/e2e#e2e-ci', 'dependency']]);
    });
  });
});
