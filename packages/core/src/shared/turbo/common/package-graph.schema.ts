import { z } from 'zod';

const packageRefSchema = z.object({ name: z.string() });

const taskRefSchema = z.object({ fullName: z.string() });

const packageRefsSchema = z.object({ items: z.array(packageRefSchema) });

const taskRefsSchema = z.object({ items: z.array(taskRefSchema) });

const taskSchema = z.object({
  fullName: z.string(),
  command: z.string().nullable(),
  script: z.string().nullable(),
  tags: z.array(z.string()),
  directDependencies: taskRefsSchema
});

const tasksSchema = z.object({ items: z.array(taskSchema) });

const packageSchema = z.object({
  name: z.string(),
  path: z.string(),
  tags: z.array(z.string()),
  directDependencies: packageRefsSchema,
  tasks: tasksSchema
});

const packagesSchema = z.object({ items: z.array(packageSchema) });

const edgeKindSchema = z.object({ kind: z.string() });

const edgeSchema = z.object({ source: z.string(), target: z.string(), kind: edgeKindSchema });

const edgesSchema = z.object({ items: z.array(edgeSchema) });

const graphSchema = z.object({ nodes: packagesSchema, edges: edgesSchema });

const dataSchema = z.object({ packageGraph: graphSchema });

/** stdout of `turbo query` with `PACKAGE_GRAPH_QUERY`. Unknown keys are stripped; every listed key is required. */
export const packageGraphSchema = z.object({ data: dataSchema });
