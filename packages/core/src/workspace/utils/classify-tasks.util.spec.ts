import { describe, expect, it } from 'vitest';

import { classifyPackages } from './classify-tasks.util.ts';
import type { GraphTask } from '../../shared/turbo/common/turbo.type.ts';
import type { ClassifiedTask, ClassifyResult, TaskAtom, TaskNodeKind } from '../common/workspace-model.type.ts';
import { graphPackage, graphTask } from '../test/utils/graph.spec.util.ts';

type TaskRow = [string, TaskNodeKind, TaskAtom | null];

const COMMAND = 'node -e 0';

const GROUP_TAG = 'atomizer:e2e-ci';

const NOT_LIVE: TaskAtom = { group: 'e2e-ci', isLive: false };

const LIVE: TaskAtom = { group: 'e2e-ci', isLive: true };

const BUILD = graphTask('a#build', COMMAND, [], []);

const FILE_TASK = graphTask('a#e2e-ci--tests/a.spec.ts', COMMAND, [GROUP_TAG], ['a#build']);

const rowOf = (task: ClassifiedTask): TaskRow => [task.id, task.kind, task.atom];

const rowsOf = (result: ClassifyResult): TaskRow[] => result.packages.flatMap((pkg) => pkg.tasks.map(rowOf));

const classifyTasks = (tasks: GraphTask[]): ClassifyResult => {
  const pkg = graphPackage('a', 'packages/a', [], tasks);

  return classifyPackages([pkg]);
};

describe('FEATURE: Atomizer task classification', () => {
  describe('GIVEN a phantom with no command and no tags', () => {
    it('WHEN classified THEN it is dropped', () => {
      const phantom = graphTask('a#lint', null, [], []);

      const result = classifyTasks([BUILD, phantom]);

      expect(rowsOf(result)).toStrictEqual([['a#build', 'task', null]]);
    });
  });

  describe('GIVEN a user dependsOn-only ci task with no command', () => {
    it('WHEN classified THEN it is dropped like a phantom', () => {
      const ci = graphTask('a#ci', null, [], ['a#build']);

      const result = classifyTasks([BUILD, ci]);

      expect(rowsOf(result)).toStrictEqual([['a#build', 'task', null]]);
    });
  });

  describe('GIVEN a carrier tagged with the group', () => {
    it('WHEN classified THEN it is dropped', () => {
      const carrier = graphTask('a#e2e-ci-src--tests/a.spec.ts', COMMAND, ['atomizer:carrier', GROUP_TAG], []);

      const result = classifyTasks([FILE_TASK, carrier]);

      expect(rowsOf(result)).toStrictEqual([['a#e2e-ci--tests/a.spec.ts', 'atom-file', NOT_LIVE]]);
    });
  });

  describe('GIVEN a file task with one group tag', () => {
    it('WHEN classified THEN it keeps its id, name, command, tags and raw dependencies as an atom-file of that group', () => {
      const expected: ClassifiedTask = {
        id: 'a#e2e-ci--tests/a.spec.ts',
        name: 'e2e-ci--tests/a.spec.ts',
        command: COMMAND,
        tags: [GROUP_TAG],
        rawDependencies: ['a#build'],
        kind: 'atom-file',
        atom: NOT_LIVE
      };

      const result = classifyTasks([FILE_TASK]);

      expect(result.packages[0]?.tasks).toStrictEqual([expected]);
    });

    it('WHEN it also carries atomizer:live THEN the atom is live', () => {
      const liveTask = graphTask('a#e2e-ci--tests/b.live.spec.ts', COMMAND, [GROUP_TAG, 'atomizer:live'], []);

      const result = classifyTasks([liveTask]);

      expect(rowsOf(result)).toStrictEqual([['a#e2e-ci--tests/b.live.spec.ts', 'atom-file', LIVE]]);
      expect(result.warnings).toStrictEqual([]);
    });
  });

  describe.each(['atomizer:live', 'atomizer:definitions', 'atomizer:'])('GIVEN a task with a command tagged only %s', (tag) => {
    it('WHEN classified THEN the tag names no group: it is a plain task with no warning', () => {
      const task = graphTask('a#check', COMMAND, [tag], []);

      const result = classifyTasks([task]);

      expect(rowsOf(result)).toStrictEqual([['a#check', 'task', null]]);
      expect(result.warnings).toStrictEqual([]);
    });
  });

  describe('GIVEN a file task tagged with the group and a bare atomizer:', () => {
    it('WHEN classified THEN it is an atom-file of that group with no warning', () => {
      const task = graphTask('a#spec', COMMAND, ['atomizer:', GROUP_TAG], []);

      const result = classifyTasks([task]);

      expect(rowsOf(result)).toStrictEqual([['a#spec', 'atom-file', NOT_LIVE]]);
      expect(result.warnings).toStrictEqual([]);
    });
  });

  describe('GIVEN a file task tagged with groups b and a', () => {
    const task = graphTask('a#spec', COMMAND, ['atomizer:b', 'atomizer:a'], []);

    it('WHEN classified THEN it is an atom-file of the first group in sort order', () => {
      const atom: TaskAtom = { group: 'a', isLive: false };

      const result = classifyTasks([task]);

      expect(rowsOf(result)).toStrictEqual([['a#spec', 'atom-file', atom]]);
    });

    it('WHEN classified THEN a warning names the task and both groups', () => {
      const result = classifyTasks([task]);

      expect(result.warnings).toStrictEqual(['a#spec: tagged with groups a, b; using a']);
    });
  });

  describe('GIVEN an e2e-ci--all carrying the group tag next to a file task of that group', () => {
    it('WHEN classified THEN it is the atom-aggregate, not an atom-file', () => {
      const aggregate = graphTask('a#e2e-ci--all', COMMAND, [GROUP_TAG], ['a#e2e-ci--tests/a.spec.ts']);

      const result = classifyTasks([FILE_TASK, aggregate]);

      expect(rowsOf(result)).toContainEqual(['a#e2e-ci--all', 'atom-aggregate', NOT_LIVE]);
    });

    it('WHEN it also carries atomizer:live THEN the aggregate is still not live', () => {
      const aggregate = graphTask('a#e2e-ci--all', COMMAND, [GROUP_TAG, 'atomizer:live'], []);

      const result = classifyTasks([FILE_TASK, aggregate]);

      expect(rowsOf(result)).toContainEqual(['a#e2e-ci--all', 'atom-aggregate', NOT_LIVE]);
    });

    it('WHEN it is tagged with a second group THEN its name sets the group and no warning is made', () => {
      const aggregate = graphTask('a#e2e-ci--all', COMMAND, [GROUP_TAG, 'atomizer:other'], []);

      const result = classifyTasks([FILE_TASK, aggregate]);

      expect(rowsOf(result)).toContainEqual(['a#e2e-ci--all', 'atom-aggregate', NOT_LIVE]);
      expect(result.warnings).toStrictEqual([]);
    });
  });

  describe('GIVEN a commandless e2e-ci next to a file task of that group', () => {
    it('WHEN classified THEN it is the atom-umbrella and keeps its null command', () => {
      const umbrella = graphTask('a#e2e-ci', null, [], ['a#e2e-ci--all']);

      const result = classifyTasks([FILE_TASK, umbrella]);

      expect(result.packages[0]?.tasks[1]).toMatchObject({ id: 'a#e2e-ci', kind: 'atom-umbrella', command: null, atom: NOT_LIVE });
    });
  });

  describe('GIVEN a renamed file task my-spec tagged with the group', () => {
    it('WHEN classified THEN it is still an atom-file', () => {
      const renamed = graphTask('a#my-spec', COMMAND, [GROUP_TAG], []);

      const result = classifyTasks([renamed]);

      expect(rowsOf(result)).toStrictEqual([['a#my-spec', 'atom-file', NOT_LIVE]]);
    });
  });

  describe('GIVEN a tagless e2e--foo with a command', () => {
    it('WHEN classified THEN its name does not make it an atom: it is a plain task', () => {
      const task = graphTask('a#e2e--foo', COMMAND, [], []);

      const result = classifyTasks([task]);

      expect(rowsOf(result)).toStrictEqual([['a#e2e--foo', 'task', null]]);
    });
  });

  describe('GIVEN a tagless lint--all with a command in a package with no atom group', () => {
    it('WHEN classified THEN it is a plain task', () => {
      const lintAll = graphTask('a#lint--all', COMMAND, [], []);

      const result = classifyTasks([lintAll]);

      expect(rowsOf(result)).toStrictEqual([['a#lint--all', 'task', null]]);
    });
  });

  describe('GIVEN an e2e-ci--all that is the only task tagged with the group', () => {
    it('WHEN classified THEN it stays an atom-file', () => {
      const aggregate = graphTask('a#e2e-ci--all', COMMAND, [GROUP_TAG], []);

      const result = classifyTasks([aggregate]);

      expect(rowsOf(result)).toStrictEqual([['a#e2e-ci--all', 'atom-file', NOT_LIVE]]);
    });
  });

  describe('GIVEN an e2e-ci with a command that is the only task tagged with the group', () => {
    it('WHEN classified THEN it stays an atom-file, not the umbrella', () => {
      const umbrellaNamed = graphTask('a#e2e-ci', COMMAND, [GROUP_TAG], []);

      const result = classifyTasks([umbrellaNamed]);

      expect(rowsOf(result)).toStrictEqual([['a#e2e-ci', 'atom-file', NOT_LIVE]]);
    });
  });

  describe('GIVEN a definitions package next to a test package', () => {
    it('WHEN classified THEN the definitions package is absent with all its tasks', () => {
      const definitionsTask = graphTask('a-atoms#e2e-ci--tests/a.spec.ts', COMMAND, [GROUP_TAG], []);
      const definitions = graphPackage('a-atoms', 'tools/a-atoms', ['atomizer:definitions'], [definitionsTask]);
      const testPackage = graphPackage('a', 'packages/a', [], [BUILD]);

      const result = classifyPackages([definitions, testPackage]);

      expect(result.packages.map((pkg) => pkg.name)).toStrictEqual(['a']);
    });
  });

  describe('GIVEN a group whose only other tagged task is a carrier', () => {
    it('WHEN classified THEN the package has no atom group, so the commandless e2e-ci is dropped as a phantom', () => {
      const carrier = graphTask('a#e2e-ci-src--tests/a.spec.ts', COMMAND, ['atomizer:carrier', GROUP_TAG], []);
      const umbrella = graphTask('a#e2e-ci', null, [], []);

      const result = classifyTasks([BUILD, carrier, umbrella]);

      expect(rowsOf(result)).toStrictEqual([['a#build', 'task', null]]);
    });
  });
});
