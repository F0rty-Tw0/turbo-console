import type { GraphEdge } from '../../../bridge/common/graph-state.type.ts';

/** A U0 package as captured: its workspace path and its measured node size. */
export type U0PackageRecord = {
  readonly name: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
};

/** A U0 task as captured: the fields the task builder reads, plus its measured node size. */
type U0TaskRecord = {
  readonly id: string;
  readonly packageName: string;
  readonly name: string;
  readonly isTurboTask: boolean;
  readonly dependencies: string[];
  readonly width: number;
  readonly height: number;
};

/** The canvas the capture fitted into, in px. */
export type U0Canvas = {
  readonly width: number;
  readonly height: number;
};

/** The three captured task views. */
type U0TaskView = 'allTasks' | 'formatOnly' | 'lintTypecheckUnit';

/** The eight captured views: the package graph and each task view, flat and grouped by folder. */
type U0View =
  | 'pkgFlat'
  | 'pkgGrouped'
  | 'allTasksFlat'
  | 'allTasksGrouped'
  | 'formatOnlyFlat'
  | 'formatOnlyGrouped'
  | 'lintTypecheckUnitFlat'
  | 'lintTypecheckUnitGrouped';

/** The U0 workspace re-captured in VS Code (U6c Task 3.1), as `u0-workspace.stub.json` holds it. */
export type U0Workspace = {
  readonly packages: U0PackageRecord[];
  readonly edges: GraphEdge[];
  readonly tasks: U0TaskRecord[];
  /** Box id to title width: package boxes by package name, Scripts boxes `scripts:<package>`, folders by folder box id. */
  readonly titleWidths: Readonly<Record<string, number>>;
  /** The shown task ids of each captured task view, scripts included. */
  readonly views: Readonly<Record<U0TaskView, string[]>>;
  /** The edge ids of each captured ELK request at any depth, sorted. */
  readonly capturedEdgeIds: Readonly<Record<U0View, string[]>>;
  readonly canvas: U0Canvas;
};
