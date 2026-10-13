import type { TaskAtom, TaskNodeKind } from '../../common/workspace-model.type.ts';

export type ProjectedPackage = {
  readonly name: string;
  readonly path: string;
  readonly tags: string[];
};

export type ProjectedTask = {
  readonly id: string;
  readonly kind: TaskNodeKind;
  readonly atom: TaskAtom | null;
  readonly dependencies: string[];
};

/** The parts of a `WorkspaceModel` a fixture manifest predicts; every list sorted, edges as `source->target`. */
export type ModelProjection = {
  readonly packages: ProjectedPackage[];
  readonly tasks: ProjectedTask[];
  readonly edges: string[];
};
