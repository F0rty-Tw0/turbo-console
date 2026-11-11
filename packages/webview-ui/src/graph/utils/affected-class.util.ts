import type { GraphAffectedMark } from '../../bridge/common/graph-affected.type.ts';
import { AFFECTED_CLASS_PREFIX } from '../common/graph-task.const.ts';

/** The class a task node carries for its affected mark. */
export const affectedClassOf = (mark: GraphAffectedMark): string => `${AFFECTED_CLASS_PREFIX}${mark}`;
