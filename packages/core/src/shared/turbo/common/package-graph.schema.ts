import { array, nullable, object, string } from 'zod/mini';

const packageRefSchema = object({ name: string() });

const taskRefSchema = object({ fullName: string() });

const packageRefsSchema = object({ items: array(packageRefSchema) });

const taskRefsSchema = object({ items: array(taskRefSchema) });

const taskSchema = object({
  fullName: string(),
  command: nullable(string()),
  script: nullable(string()),
  tags: array(string()),
  directDependencies: taskRefsSchema
});

const tasksSchema = object({ items: array(taskSchema) });

const packageSchema = object({
  name: string(),
  path: string(),
  tags: array(string()),
  directDependencies: packageRefsSchema,
  tasks: tasksSchema
});

const packagesSchema = object({ items: array(packageSchema) });

const edgeKindSchema = object({ kind: string() });

const edgeSchema = object({ source: string(), target: string(), kind: edgeKindSchema });

const edgesSchema = object({ items: array(edgeSchema) });

const graphSchema = object({ nodes: packagesSchema, edges: edgesSchema });

const dataSchema = object({ packageGraph: graphSchema, root: nullable(packageSchema) });

/**
 * stdout of `turbo query` with `PACKAGE_GRAPH_QUERY`. Unknown keys are stripped; every listed key is required. `root` is
 * `null` when turbo has no `//` package.
 */
export const packageGraphSchema = object({ data: dataSchema });
