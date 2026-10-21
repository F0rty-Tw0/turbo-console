import { manifestFileOf } from './details-text.util.ts';
import { neighboursOf } from './neighbours.util.ts';
import type {
  CandidateGroupModel,
  CandidateModel,
  LinkViewModel,
  NeighbourModel,
  PackageViewModel,
  PickingViewModel,
  TraceStepModel,
  TraceViewModel
} from '../common/details.type.ts';
import type { DetailsContext } from '../common/graph-details.type.ts';
import type { TraceInspection } from '../common/inspection.type.ts';
import type { TraceCandidate, TraceCandidates, TraceResult } from '../common/trace.type.ts';

const neighbourModels = (names: string[], visible: ReadonlySet<string>): NeighbourModel[] => {
  const modelOf = (name: string): NeighbourModel => {
    const model: NeighbourModel = { name, isVisible: visible.has(name) };

    return model;
  };

  return names.map(modelOf);
};

/** `null` when the package has no record in the drawn graph. */
export const packageModelOf = (name: string, context: DetailsContext): PackageViewModel | null => {
  const { drawn, visible, focus } = context;
  const byName = new Map(drawn.infos.map((info) => [info.name, info]));
  const info = byName.get(name);

  if (info === undefined) return null;

  const neighbours = neighboursOf(name, drawn.edges);
  const dependencies = neighbourModels(neighbours.dependencies, visible);
  const dependents = neighbourModels(neighbours.dependents, visible);
  const { path, tags, taskCount } = info;
  const model: PackageViewModel = { name, path, tags, taskCount, isFocused: focus === name, dependencies, dependents };

  return model;
};

/** The entry lives in the dependent's manifest; a source with no record falls back to the root manifest. */
export const linkModelOf = (source: string, target: string, context: DetailsContext): LinkViewModel => {
  const info = context.drawn.infos.find((candidate) => candidate.name === source);
  const path = info?.path ?? '';
  const file = manifestFileOf(path);
  const model: LinkViewModel = { source, target, file };

  return model;
};

/** The steps run in `trace.path` order, dependent first, whichever end the trace started at. */
export const traceModelOf = (
  inspection: TraceInspection,
  trace: TraceResult,
  visible: ReadonlySet<string>,
  showable: ReadonlySet<string>
): TraceViewModel => {
  const { start, end } = inspection;
  const stepOf = (name: string): TraceStepModel => {
    const step: TraceStepModel = { name, isVisible: visible.has(name), isShowable: showable.has(name) };

    return step;
  };
  const steps = trace.path.map(stepOf);
  const model: TraceViewModel = { start, end, direction: trace.direction, steps };

  return model;
};

const pathItemOf = (candidate: TraceCandidate): CandidateModel => {
  const item: CandidateModel = { name: candidate.name, steps: candidate.steps };

  return item;
};

const noneItemOf = (name: string): CandidateModel => {
  const item: CandidateModel = { name, steps: null };

  return item;
};

/** Each group's `total` counts `candidates`, its items come from `filtered`. */
export const pickingModelOf = (start: string, candidates: TraceCandidates, filtered: TraceCandidates): PickingViewModel => {
  const forwardItems = filtered.forward.map(pathItemOf);
  const backwardItems = filtered.backward.map(pathItemOf);
  const noneItems = filtered.none.map(noneItemOf);
  const forward: CandidateGroupModel = { key: 'forward', total: candidates.forward.length, items: forwardItems };
  const backward: CandidateGroupModel = { key: 'backward', total: candidates.backward.length, items: backwardItems };
  const none: CandidateGroupModel = { key: 'none', total: candidates.none.length, items: noneItems };
  const model: PickingViewModel = { start, groups: [forward, backward, none] };

  return model;
};
