/** `changed`: the task's own package changed; `dependency`: it runs because of another package or task. */
export type GraphAffectedMark = 'changed' | 'dependency';

/** Task id to mark, only for the tasks the store marks; the root's level names the legend rows. */
export type GraphAffected = {
  readonly mode: 'task' | 'package';
  readonly tasks: Readonly<Record<string, GraphAffectedMark>>;
};
