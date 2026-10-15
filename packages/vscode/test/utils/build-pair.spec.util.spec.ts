import { describe, expect, it } from 'vitest';

import { buildPair } from './build-pair.spec.util.ts';
import type { ShownManifest, ShownTask } from '../common/launch.type.ts';

const taskOf = (fullName: string, dependencies: string[], change: Partial<ShownTask> = {}): ShownTask => {
  const task: ShownTask = {
    fullName,
    packageName: fullName.split('#')[0] ?? fullName,
    kind: 'task',
    dependencies,
    visible: true,
    ...change
  };

  return task;
};

const manifestOf = (tasks: ShownTask[]): ShownManifest => {
  const manifest: ShownManifest = { packages: [], tasks };

  return manifest;
};

describe('FEATURE: buildPair', () => {
  describe('GIVEN shown build tasks listed out of name order', () => {
    it('WHEN two builds depend on others THEN X is the first by name and Y its first build dependency', () => {
      const manifest = manifestOf([
        taskOf('c#build', ['a#build']),
        taskOf('b#build', ['b#lint', 'd#build', 'a#build']),
        taskOf('a#build', []),
        taskOf('d#build', [])
      ]);

      const [x, y] = buildPair(manifest);

      expect([x.fullName, y.fullName]).toStrictEqual(['b#build', 'd#build']);
    });
  });

  describe('GIVEN builds that are hidden or not plain tasks', () => {
    it('WHEN they would come first THEN buildPair skips them as X and as Y', () => {
      const manifest = manifestOf([
        taskOf('a#build', ['z#build'], { visible: false }),
        taskOf('b#build', ['y#build', 'z#build'], { kind: 'umbrella' }),
        taskOf('c#build', ['y#build', 'z#build']),
        taskOf('y#build', [], { visible: false }),
        taskOf('z#build', [])
      ]);

      const [x, y] = buildPair(manifest);

      expect([x.fullName, y.fullName]).toStrictEqual(['c#build', 'z#build']);
    });
  });

  describe('GIVEN no build that depends on another shown build', () => {
    it('WHEN buildPair runs THEN it throws', () => {
      const manifest = manifestOf([taskOf('a#build', ['a#lint']), taskOf('b#build', [])]);

      expect(() => buildPair(manifest)).toThrow('the manifest has no build task that depends on another');
    });
  });
});
