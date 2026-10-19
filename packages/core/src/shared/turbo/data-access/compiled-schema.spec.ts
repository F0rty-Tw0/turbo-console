import { describe, expect, it } from 'vitest';
import type { ZodMiniType } from 'zod/mini';

import { lazyCompiled } from './compiled-schema.ts';
import { invalidOutputMessage } from '../../errors/utils/turbo-message.util.ts';
import { affectedTasksSchema } from '../common/affected-tasks.schema.ts';
import { dryRunSchema } from '../common/dry-run.schema.ts';
import { packageGraphSchema } from '../common/package-graph.schema.ts';

const BUILD_TASK =
  '{"fullName":"web#build","command":"vite build","script":"vite build","tags":[],"extra":true,' +
  '"directDependencies":{"items":[{"fullName":"ui#build","extra":1}]}}';

const PHANTOM_TASK = '{"fullName":"web#lint","command":null,"script":null,"tags":["ci"],"directDependencies":{"items":[]}}';

const WEB_PACKAGE =
  '{"name":"web","path":"apps/web","tags":["app"],"extra":"x","directDependencies":{"items":[{"name":"ui","extra":1}]},' +
  `"tasks":{"items":[${BUILD_TASK},${PHANTOM_TASK}]}}`;

const EDGES = '{"items":[{"source":"web","target":"ui","kind":{"kind":"dependency","extra":1}}]}';

/** turbo's `packageGraph` stdout, with keys the schema does not list at every level. */
const PACKAGE_GRAPH = `{"data":{"packageGraph":{"nodes":{"items":[${WEB_PACKAGE}]},"edges":${EDGES}}},"extensions":{}}`;

const DEFINITION = '{"inputs":["src/**"],"outputs":[],"dependsOn":["^build"],"cache":true,"persistent":false,"env":[]}';

const DRY_TASK_HEAD = '"taskId":"web#build","package":"web","task":"build","command":"<NONEXISTENT>"';

const DRY_TASK_TAIL = `"resolvedTaskDefinition":${DEFINITION},"dependencies":[],"dependents":[]`;

/** turbo's `--dry=json` stdout, with the `dependencies` and `dependents` keys the schema leaves out. */
const DRY_RUN = `{"id":"run","tasks":[{${DRY_TASK_HEAD},"hash":null,"cache":{"status":"MISS","local":false},${DRY_TASK_TAIL}}]}`;

/** turbo's `affectedTasks` stdout, with keys the schema does not list. */
const AFFECTED = '{"data":{"affectedTasks":{"items":[{"fullName":"web#build","reason":{"__typename":"TaskFileChanged","extra":1}}]}}}';

const GRAPH_WITHOUT_EDGES = `{"data":{"packageGraph":{"nodes":{"items":[${WEB_PACKAGE}]}}}}`;

const NUMBER_TAG_PACKAGE = WEB_PACKAGE.replace('"tags":["app"]', '"tags":[1]');

const GRAPH_WITH_NUMBER_TAG = `{"data":{"packageGraph":{"nodes":{"items":[${NUMBER_TAG_PACKAGE}]},"edges":${EDGES}}}}`;

const DRY_RUN_WITHOUT_HASH = `{"tasks":[{${DRY_TASK_HEAD},"cache":{"status":"MISS"},${DRY_TASK_TAIL}}]}`;

const DRY_RUN_WITH_BAD_STATUS = `{"tasks":[{${DRY_TASK_HEAD},"hash":"abc","cache":{"status":"STALE"},${DRY_TASK_TAIL}}]}`;

const AFFECTED_WITHOUT_REASON = '{"data":{"affectedTasks":{"items":[{"fullName":"web#build"}]}}}';

/** Every key the fixtures add beyond their schema. */
const UNLISTED_KEY = /"(extra|extensions|id|local|dependencies|dependents)":/;

/** A label, the schema, and turbo's stdout as text, parsed with `JSON.parse` as `runTurboJson` does. */
type Case = [string, ZodMiniType, string];

const VALID: Case[] = [
  ['the package graph', packageGraphSchema, PACKAGE_GRAPH],
  ['a dry run', dryRunSchema, DRY_RUN],
  ['affected tasks', affectedTasksSchema, AFFECTED]
];

const INVALID: Case[] = [
  ['a package graph with no edges', packageGraphSchema, GRAPH_WITHOUT_EDGES],
  ['a package graph with a number tag', packageGraphSchema, GRAPH_WITH_NUMBER_TAG],
  ['a package graph that is an array', packageGraphSchema, `[${PACKAGE_GRAPH}]`],
  ['a dry-run task with no hash key', dryRunSchema, DRY_RUN_WITHOUT_HASH],
  ['a dry-run task with an unknown cache status', dryRunSchema, DRY_RUN_WITH_BAD_STATUS],
  ['a dry run that is null', dryRunSchema, 'null'],
  ['an affected task with no reason', affectedTasksSchema, AFFECTED_WITHOUT_REASON]
];

const thrownBy = (parse: () => unknown): unknown => {
  try {
    return parse();
  } catch (error) {
    return error;
  }
};

describe('FEATURE: lazily compiled schemas', () => {
  describe('GIVEN a getter from lazyCompiled', () => {
    it('WHEN it is called twice THEN both calls return the same compiled schema', () => {
      const compiledGraph = lazyCompiled(packageGraphSchema);

      expect(compiledGraph()).toBe(compiledGraph());
    });

    it('WHEN it is called THEN the schema is a compiled clone, not the runtime schema', () => {
      const compiledGraph = lazyCompiled(packageGraphSchema);

      expect(compiledGraph()).not.toBe(packageGraphSchema);
    });
  });

  describe('GIVEN valid turbo output with keys the schema does not list', () => {
    it.each(VALID)(
      'WHEN %s is parsed compiled THEN the output equals the runtime parse, unlisted keys stripped',
      (_, schema, stdout) => {
        const input: unknown = JSON.parse(stdout);
        const compiledSchema = lazyCompiled(schema)();
        const expected: unknown = schema.parse(input);

        const parsed: unknown = compiledSchema.parse(input);

        expect(parsed).toStrictEqual(expected);
      }
    );

    it.each(VALID)('WHEN %s is parsed compiled THEN no unlisted key survives', (_, schema, stdout) => {
      const input: unknown = JSON.parse(stdout);
      const compiledSchema = lazyCompiled(schema)();

      const text = JSON.stringify(compiledSchema.parse(input));

      expect(text).not.toMatch(UNLISTED_KEY);
    });
  });

  describe('GIVEN turbo output that breaks its schema', () => {
    it.each(INVALID)('WHEN %s is parsed compiled THEN it fails with the runtime issues', (_, schema, stdout) => {
      const input: unknown = JSON.parse(stdout);
      const compiledSchema = lazyCompiled(schema)();
      const runtime = schema.safeParse(input);

      const compiled = compiledSchema.safeParse(input);

      expect(compiled.success).toBe(false);
      expect(compiled.error?.issues).toStrictEqual(runtime.error?.issues);
    });

    it.each(INVALID)('WHEN %s is parsed compiled THEN its thrown error names the same schema failure', (_, schema, stdout) => {
      const input: unknown = JSON.parse(stdout);
      const compiledSchema = lazyCompiled(schema)();
      const runtimeError = thrownBy(() => schema.parse(input));
      const expected = invalidOutputMessage('query', runtimeError);

      const error = thrownBy(() => compiledSchema.parse(input));

      expect(expected).toMatch(/^turbo query output failed its schema at /);
      expect(invalidOutputMessage('query', error)).toBe(expected);
    });
  });
});
