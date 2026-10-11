import { describe, expect, it } from 'vitest';

import { renderTurboJson } from './render-turbo-json.util.ts';
import type { FixturePlan, FixtureSpec } from '../common/fixture.type.ts';
import { FIXTURE_SPEC_STUB } from '../test/stubs/fixture.stub.ts';

describe('FEATURE: root turbo.json rendering', () => {
  describe('GIVEN the stub spec with six tasks, no atom groups and affectedUsingTaskInputs on', () => {
    const plan: FixturePlan = { spec: FIXTURE_SPEC_STUB, packages: [] };

    it('WHEN rendered THEN the file is turbo.json at the fixture root', () => {
      const file = renderTurboJson(plan);

      expect(file.path).toBe('turbo.json');
    });

    it('WHEN rendered THEN the content equals the expected turbo.json byte for byte', () => {
      const build = { dependsOn: ['^build'] };
      const test = { dependsOn: ['^build'], inputs: ['src/**'] };
      const typecheck = { dependsOn: ['^build'] };
      const task5 = { dependsOn: ['^task-5', 'build'] };
      const task6 = { dependsOn: ['^task-6', 'build'] };
      const tasks = { build, lint: {}, test, typecheck, 'task-5': task5, 'task-6': task6 };
      const futureFlags = { affectedUsingTaskInputs: true };
      const turbo = { $schema: 'https://turborepo.com/schema.json', agentGuidance: false, tasks, futureFlags };
      const expected = `${JSON.stringify(turbo, null, 2)}\n`;

      const file = renderTurboJson(plan);

      expect(file.content).toBe(expected);
    });
  });

  describe('GIVEN one atom group and affectedUsingTaskInputs off', () => {
    it('WHEN rendered THEN futureFlags enables experimentalTaskCommand and turns affectedUsingTaskInputs off', () => {
      const atomGroups = { ...FIXTURE_SPEC_STUB.atomGroups, count: 1 };
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, atomGroups, affectedUsingTaskInputs: false };
      const plan: FixturePlan = { spec, packages: [] };

      const turbo: unknown = JSON.parse(renderTurboJson(plan).content);

      expect(turbo).toHaveProperty('futureFlags', { experimentalTaskCommand: true, affectedUsingTaskInputs: false });
    });
  });

  describe('GIVEN lint as the narrow-inputs task', () => {
    it('WHEN rendered THEN lint gets src/** inputs and test gets none', () => {
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, narrowInputsTask: 'lint' };
      const plan: FixturePlan = { spec, packages: [] };

      const turbo: unknown = JSON.parse(renderTurboJson(plan).content);

      expect(turbo).toHaveProperty(['tasks', 'lint'], { inputs: ['src/**'] });
      expect(turbo).toHaveProperty(['tasks', 'test'], { dependsOn: ['^build'] });
    });
  });
});
