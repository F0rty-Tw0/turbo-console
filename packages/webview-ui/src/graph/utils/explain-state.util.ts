import { excerptRowsOf } from './excerpt.util.ts';
import type { EdgeExplainResult, GraphEdgeExplainedMessage, ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import type { ExplainState, MissingExplain } from '../common/details.type.ts';
import type { ExplainPlan } from '../common/graph-details.type.ts';
import type { Inspection } from '../common/inspection.type.ts';

/** What the explain block shows for a host reply about the link to `target`. */
export const explainStateOf = (result: EdgeExplainResult, target: string): ExplainState => {
  if (result.kind !== 'missing') return result;

  const missing: MissingExplain = { kind: 'missing', file: result.file, target };

  return missing;
};

/** A reply counts only while its exact link is shown; a stale or reversed one is dropped. */
export const isReplyFor = (message: GraphEdgeExplainedMessage, current: Inspection | null): boolean => {
  if (current?.kind !== 'link') return false;

  return message.source === current.source && message.target === current.target;
};

const rowCountOf = (entry: ManifestEntry): number => excerptRowsOf(entry).length;

const isSameShape = (previous: ManifestEntry[], next: ManifestEntry[]): boolean => {
  const before = previous.map(rowCountOf);
  const after = next.map(rowCountOf);
  const isSameLength = before.length === after.length;

  return isSameLength && before.every((count, index) => count === after[index]);
};

/** `update` keeps the block's controls, so focus stays: the same kind and, when found, the same entry and row counts. */
export const explainPlanOf = (previous: ExplainState, next: ExplainState): ExplainPlan => {
  if (previous.kind !== next.kind) return 'rebuild';

  if (previous.kind !== 'found' || next.kind !== 'found') return 'update';

  const isSame = isSameShape(previous.entries, next.entries);

  return isSame ? 'update' : 'rebuild';
};
