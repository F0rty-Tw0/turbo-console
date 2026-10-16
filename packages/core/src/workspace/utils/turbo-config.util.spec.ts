import { describe, expect, it } from 'vitest';

import { parseTurboConfig } from './turbo-config.util.ts';
import type { TaskPresence, TurboConfigError, TurboConfigOk } from '../common/turbo-config.type.ts';

const PATH = 'packages/a/turbo.jsonc';

const BUILD_DEFINED: Record<string, TaskPresence> = { build: 'defined' };

const BUILD_LINT_DEFINED: Record<string, TaskPresence> = { build: 'defined', lint: 'defined' };

const NO_PERSISTENT: Record<string, boolean> = {};

const okConfig = (
  descriptions: Record<string, string>,
  affectedUsingTaskInputs: boolean,
  tasks: Record<string, TaskPresence> = {},
  extendsNames: string[] = []
): TurboConfigOk => {
  const config: TurboConfigOk = {
    path: PATH,
    descriptions,
    tasks,
    persistent: {},
    extends: extendsNames,
    affectedUsingTaskInputs
  };

  return config;
};

const errorConfig = (error: string): TurboConfigError => {
  const config: TurboConfigError = { path: PATH, error };

  return config;
};

describe('FEATURE: turbo.json(c) parsing', () => {
  describe('GIVEN a config with comments and trailing commas', () => {
    it('WHEN parsed THEN it is read as JSON with comments', () => {
      const text = '{\n  // tasks\n  "tasks": { "build": { "description": "x", /* why */ }, },\n}';

      const config = parseTurboConfig(PATH, text);

      expect(config).toStrictEqual(okConfig({ build: 'x' }, false, BUILD_DEFINED));
    });
  });

  describe('GIVEN a task with a string description', () => {
    it('WHEN parsed THEN descriptions map the task name to it', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"build":{"description":"x"}}}');

      expect(config).toStrictEqual(okConfig({ build: 'x' }, false, BUILD_DEFINED));
    });
  });

  describe('GIVEN tasks without descriptions and other future flags', () => {
    it('WHEN parsed THEN the config is ok with no descriptions and the flag off', () => {
      const text = '{"tasks":{"build":{},"lint":{"dependsOn":[]}},"futureFlags":{"experimentalTaskCommand":true}}';

      const config = parseTurboConfig(PATH, text);

      expect(config).toStrictEqual(okConfig({}, false, BUILD_LINT_DEFINED));
    });
  });

  describe('GIVEN a non-string description', () => {
    it('WHEN parsed THEN it is ignored', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"build":{"description":1},"lint":{"description":"l"}}}');

      expect(config).toStrictEqual(okConfig({ lint: 'l' }, false, BUILD_LINT_DEFINED));
    });
  });

  describe('GIVEN futureFlags.affectedUsingTaskInputs', () => {
    it('WHEN it is true THEN affectedUsingTaskInputs is true', () => {
      const config = parseTurboConfig(PATH, '{"futureFlags":{"affectedUsingTaskInputs":true}}');

      expect(config).toStrictEqual(okConfig({}, true));
    });

    it('WHEN it is the string "true" THEN affectedUsingTaskInputs is false', () => {
      const config = parseTurboConfig(PATH, '{"futureFlags":{"affectedUsingTaskInputs":"true"}}');

      expect(config).toStrictEqual(okConfig({}, false));
    });
  });

  describe('GIVEN text that does not parse', () => {
    it('WHEN it is cut off THEN the first parse error and its offset are named', () => {
      const config = parseTurboConfig(PATH, '{');

      expect(config).toStrictEqual(errorConfig('CloseBraceExpected at 1'));
    });

    it('WHEN it is empty THEN a missing value is named', () => {
      const config = parseTurboConfig(PATH, '');

      expect(config).toStrictEqual(errorConfig('ValueExpected at 0'));
    });
  });

  describe('GIVEN objects nested deeper than the stack allows', () => {
    it('WHEN parsed THEN the error is too deeply nested', () => {
      const depth = 100_000;
      const text = `${'{"a":'.repeat(depth)}1${'}'.repeat(depth)}`;

      const config = parseTurboConfig(PATH, text);

      expect(config).toStrictEqual(errorConfig('too deeply nested'));
    });
  });

  describe('GIVEN JSON that is not an object', () => {
    it('WHEN parsed THEN the error is not an object', () => {
      const config = parseTurboConfig(PATH, '[]');

      expect(config).toStrictEqual(errorConfig('not an object'));
    });
  });

  describe('GIVEN an object whose tasks is not an object', () => {
    it('WHEN parsed THEN the schema failure reads not an object', () => {
      const config = parseTurboConfig(PATH, '{"tasks":5}');

      expect(config).toStrictEqual(errorConfig('not an object'));
    });
  });

  describe('GIVEN a root config with qualified and root task keys', () => {
    it('WHEN parsed THEN every key is a defined task, verbatim', () => {
      const text = '{\n  // root\n  "tasks": { "build": {}, "web#special": {}, /* root */ "//#fmt": {} },\n}';

      const tasks: Record<string, TaskPresence> = { build: 'defined', 'web#special': 'defined', '//#fmt': 'defined' };

      const config = parseTurboConfig(PATH, text);

      expect(config).toStrictEqual(okConfig({}, false, tasks));
    });
  });

  describe('GIVEN a package config extending the root and a package', () => {
    const text = '{"extends":["//","shared"],"tasks":{"own":{},"lint":{"extends":false},"build":{"extends":false,"outputs":[]}}}';

    it('WHEN parsed THEN extends lists both names', () => {
      const config = parseTurboConfig(PATH, text);

      expect(config).toMatchObject({ extends: ['//', 'shared'] });
    });

    it('WHEN parsed THEN exactly extends false is excluded and extends false beside a value is fresh', () => {
      const tasks: Record<string, TaskPresence> = { own: 'defined', lint: 'excluded', build: 'fresh' };

      const config = parseTurboConfig(PATH, text);

      expect(config).toMatchObject({ tasks });
    });
  });

  describe('GIVEN task entries that set extends false', () => {
    it('WHEN the entry is exactly extends false THEN it is excluded', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"dev":{"extends":false}}}');

      expect(config).toHaveProperty('tasks', { dev: 'excluded' });
    });

    it('WHEN extends false sits beside outputs THEN it is fresh', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"dev":{"extends":false,"outputs":[]}}}');

      expect(config).toHaveProperty('tasks', { dev: 'fresh' });
    });

    it('WHEN extends false sits beside persistent THEN it is fresh', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"dev":{"extends":false,"persistent":true}}}');

      expect(config).toHaveProperty('tasks', { dev: 'fresh' });
    });
  });

  describe('GIVEN task entries without extends false', () => {
    it('WHEN the entry is empty THEN it is defined', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"dev":{}}}');

      expect(config).toHaveProperty('tasks', { dev: 'defined' });
    });

    it('WHEN the entry sets outputs THEN it is defined', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"dev":{"outputs":[]}}}');

      expect(config).toHaveProperty('tasks', { dev: 'defined' });
    });
  });

  describe('GIVEN task entries with and without a boolean persistent', () => {
    it('WHEN parsed THEN persistent maps only the boolean values by task key', () => {
      const text = '{"tasks":{"dev":{"persistent":true},"x":{"persistent":"yes"},"y":{},"web#dev":{"persistent":false}}}';

      const config = parseTurboConfig(PATH, text);

      expect(config).toHaveProperty('persistent', { dev: true, 'web#dev': false });
    });
  });

  describe('GIVEN an extends that is not a list of names', () => {
    it('WHEN it is a string THEN extends is empty', () => {
      const config = parseTurboConfig(PATH, '{"extends":"//"}');

      expect(config).toStrictEqual(okConfig({}, false));
    });

    it('WHEN it holds a number THEN only the names are kept', () => {
      const config = parseTurboConfig(PATH, '{"extends":["//",1]}');

      expect(config).toStrictEqual(okConfig({}, false, {}, ['//']));
    });
  });

  describe('GIVEN __proto__ keys', () => {
    it('WHEN a task named __proto__ sits beside build THEN that task gets no description', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"__proto__":{"description":"x"},"build":{"description":"b"}}}');

      expect(config).toStrictEqual(okConfig({ build: 'b' }, false, BUILD_DEFINED));
    });

    it('WHEN a task named __proto__ sets persistent THEN persistent gets no key and keeps its prototype', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"__proto__":{"persistent":true},"dev":{"persistent":true}}}');

      const persistent = 'persistent' in config ? config.persistent : NO_PERSISTENT;
      const keys = Object.keys(persistent);
      const prototype: unknown = Object.getPrototypeOf(persistent);

      expect({ keys, prototype }).toStrictEqual({ keys: ['dev'], prototype: Object.prototype });
    });

    it('WHEN a task holds a __proto__ object with persistent THEN dev inherits no persistent', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"dev":{"__proto__":{"persistent":true}}}}');

      expect(config).toHaveProperty('persistent', {});
    });

    it('WHEN a task holds a __proto__ object with a description THEN build inherits no description', () => {
      const config = parseTurboConfig(PATH, '{"tasks":{"build":{"__proto__":{"description":"x"}}}}');

      expect(config).toStrictEqual(okConfig({}, false, BUILD_DEFINED));
    });

    it('WHEN the root holds a __proto__ object with futureFlags THEN the flag stays off', () => {
      const config = parseTurboConfig(PATH, '{"__proto__":{"futureFlags":{"affectedUsingTaskInputs":true}}}');

      expect(config).toStrictEqual(okConfig({}, false));
    });
  });
});
