import { afterEach, describe, expect, it, vi } from 'vitest';
import { number, object, string, xor } from 'zod/mini';
import type { ZodMiniType } from 'zod/mini';
import { compileFn } from 'zod/v4/core';

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

  describe('GIVEN a hot schema', () => {
    /**
     * `compileFn` throws when the root cannot be modeled. The parser is not `definite` when a child runs as a runtime
     * island, or when a user callback (`refine`, `transform`) is hoisted into it: a hot schema that gains one fails here
     * and needs a look at whether it still compiles whole.
     */
    it.each(VALID)(
      'WHEN %s is compiled THEN the generated parser is definite: no runtime island, no hoisted callback',
      (_, schema) => {
        expect(compileFn(schema).definite).toBe(true);
      }
    );

    it('WHEN a schema holds a child compile cannot model THEN the same check sees the island', () => {
      const withIsland = object({ name: string(), value: xor([string(), number()]) });

      expect(compileFn(withIsland).definite).toBe(false);
    });
  });

  describe('GIVEN a host that refuses generated code', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('WHEN the getter is called THEN it returns the runtime schema, which still parses turbo output', () => {
      const refuseCodegen = (): never => {
        throw new EvalError('Code generation from strings disallowed for this context');
      };
      const compiledGraph = lazyCompiled(packageGraphSchema);
      const input: unknown = JSON.parse(PACKAGE_GRAPH);

      vi.stubGlobal('Function', refuseCodegen);

      const schema = compiledGraph();

      vi.unstubAllGlobals();

      expect(schema).toBe(packageGraphSchema);
      expect(schema.parse(input)).toStrictEqual(packageGraphSchema.parse(input));
    });
  });
});
