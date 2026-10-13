import type { GraphPackage, GraphTask, PackageGraph } from '../../../shared/turbo/common/turbo.type.ts';

type GraphTaskRef = GraphTask['directDependencies']['items'][number];

type GraphEdge = PackageGraph['data']['packageGraph']['edges']['items'][number];

const taskRef = (fullName: string): GraphTaskRef => {
  const ref: GraphTaskRef = { fullName };

  return ref;
};

/** A `packageGraph` task; `script` mirrors `command`, since classification never reads it. */
export const graphTask = (fullName: string, command: string | null, tags: string[], deps: string[]): GraphTask => {
  const items = deps.map(taskRef);
  const directDependencies = { items };
  const task: GraphTask = { fullName, command, script: command, tags, directDependencies };

  return task;
};

/** A `packageGraph` package with no package dependencies. */
export const graphPackage = (name: string, path: string, tags: string[], tasks: GraphTask[]): GraphPackage => {
  const directDependencies = { items: [] };
  const taskList = { items: tasks };
  const pkg: GraphPackage = { name, path, tags, directDependencies, tasks: taskList };

  return pkg;
};

/** A `packageGraph` edge between two package names; `kind` becomes turbo's `kind.kind`. */
export const graphEdge = (source: string, target: string, kind: string): GraphEdge => {
  const edgeKind = { kind };
  const edge: GraphEdge = { source, target, kind: edgeKind };

  return edge;
};

/** The parsed `PACKAGE_GRAPH_QUERY` output holding these nodes and edges. */
export const packageGraph = (packages: GraphPackage[], edges: GraphEdge[]): PackageGraph => {
  const nodes = { items: packages };
  const edgeList = { items: edges };
  const graphData = { nodes, edges: edgeList };
  const data = { packageGraph: graphData };
  const graph: PackageGraph = { data };

  return graph;
};
