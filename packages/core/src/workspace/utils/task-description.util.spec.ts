import { describe, expect, it } from 'vitest';

import { affectedModeOf, descriptionOf, okConfigsByDir } from './task-description.util.ts';
import type { TurboConfigError, TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';

const PACKAGE_DESCRIPTIONS = { build: 'from the package' };

const ROOT_DESCRIPTIONS = { '@fx/hub#build': 'from root pkg#task', build: 'from root task', lint: 'root lint' };

const BARE_ONLY_DESCRIPTIONS = { build: 'from root task' };

const ATOMS_DESCRIPTIONS = { 'e2e-ci': 'from the extended config' };

const HUB: TurboConfigOk = { path: 'packages/hub/turbo.json', descriptions: PACKAGE_DESCRIPTIONS, affectedUsingTaskInputs: false };

const ROOT: TurboConfigOk = { path: 'turbo.json', descriptions: ROOT_DESCRIPTIONS, affectedUsingTaskInputs: false };

const BARE_ROOT: TurboConfigOk = { path: 'turbo.json', descriptions: BARE_ONLY_DESCRIPTIONS, affectedUsingTaskInputs: false };

const EMPTY_ROOT: TurboConfigOk = { path: 'turbo.jsonc', descriptions: {}, affectedUsingTaskInputs: false };

const EMPTY_HUB: TurboConfigOk = { path: 'packages/hub/turbo.jsonc', descriptions: {}, affectedUsingTaskInputs: false };

const ATOMS: TurboConfigOk = {
  path: 'tools/e2e-1-atoms/turbo.json',
  descriptions: ATOMS_DESCRIPTIONS,
  affectedUsingTaskInputs: false
};

const TASK_MODE_ROOT: TurboConfigOk = { path: 'turbo.json', descriptions: {}, affectedUsingTaskInputs: true };

const ROOT_ERROR: TurboConfigError = { path: 'turbo.json', error: 'InvalidSymbol at 3' };

const HUB_ERROR: TurboConfigError = { path: 'packages/hub/turbo.json', error: 'InvalidSymbol at 3' };

const describeTask = (configs: TurboConfigFile[], packagePath: string, id: string): string | null => {
  const byDir = okConfigsByDir(configs);

  return descriptionOf(byDir, packagePath, id);
};

describe('FEATURE: task descriptions (rule 5)', () => {
  describe('GIVEN a package config and root keys that all describe build', () => {
    it('WHEN the package task is described THEN the package config wins', () => {
      const description = describeTask([HUB, ROOT], 'packages/hub', '@fx/hub#build');

      expect(description).toBe('from the package');
    });

    it('WHEN another package runs build THEN it gets the root bare key, not the hub package config', () => {
      const description = describeTask([HUB, ROOT], 'packages/other', '@fx/other#build');

      expect(description).toBe('from root task');
    });
  });

  describe('GIVEN root keys pkg#task and task only', () => {
    it('WHEN the task is described THEN root pkg#task wins over root task', () => {
      const description = describeTask([ROOT], 'packages/hub', '@fx/hub#build');

      expect(description).toBe('from root pkg#task');
    });
  });

  describe('GIVEN only a root bare task key', () => {
    it('WHEN the task is described THEN the bare key is used', () => {
      const description = describeTask([BARE_ROOT], 'packages/hub', '@fx/hub#build');

      expect(description).toBe('from root task');
    });
  });

  describe('GIVEN no config describes the task', () => {
    it('WHEN the task is described THEN the description is null', () => {
      const description = describeTask([HUB, ROOT], 'packages/hub', '@fx/hub#test');

      expect(description).toBeNull();
    });
  });

  describe('GIVEN a package config that failed to parse', () => {
    it('WHEN its task is described THEN it contributes nothing and the root key is used', () => {
      const description = describeTask([HUB_ERROR, BARE_ROOT], 'packages/hub', '@fx/hub#build');

      expect(description).toBe('from root task');
    });
  });

  describe('GIVEN @fx/e2e-1 whose config is reached only through a non-root extends', () => {
    it('WHEN its task is described THEN the extended config contributes nothing', () => {
      const description = describeTask([ATOMS], 'apps/e2e-1', '@fx/e2e-1#e2e-ci');

      expect(description).toBeNull();
    });
  });

  describe('GIVEN empty configs and tasks named after Object.prototype members', () => {
    it('WHEN constructor is described through the root config THEN the description is null', () => {
      const description = describeTask([EMPTY_ROOT], 'packages/hub', '@fx/hub#constructor');

      expect(description).toBeNull();
    });

    it('WHEN toString is described through the package config THEN the description is null', () => {
      const description = describeTask([EMPTY_HUB], 'packages/hub', '@fx/hub#toString');

      expect(description).toBeNull();
    });
  });
});

describe('FEATURE: affected mode', () => {
  describe('GIVEN a parsed root config', () => {
    it('WHEN affectedUsingTaskInputs is true THEN the mode is task', () => {
      const mode = affectedModeOf(TASK_MODE_ROOT);

      expect(mode).toBe('task');
    });

    it('WHEN affectedUsingTaskInputs is false THEN the mode is package', () => {
      const mode = affectedModeOf(ROOT);

      expect(mode).toBe('package');
    });
  });

  describe('GIVEN a root config that failed to parse', () => {
    it('WHEN the mode is read THEN it is package', () => {
      const mode = affectedModeOf(ROOT_ERROR);

      expect(mode).toBe('package');
    });
  });

  describe('GIVEN no root config', () => {
    it('WHEN the mode is read THEN it is package', () => {
      const mode = affectedModeOf(null);

      expect(mode).toBe('package');
    });
  });
});
