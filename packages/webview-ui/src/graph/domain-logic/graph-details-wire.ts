import { namedButtonOf, wirePicking } from './graph-details-picking.ts';
import type {
  EmptyDetails,
  ExplainDetails,
  FolderViewElements,
  NeighbourItem,
  PackageDetails,
  TraceDetails
} from '../common/details-view.type.ts';
import type { ExplainState } from '../common/details.type.ts';
import type {
  DetailsContext,
  DetailsEnv,
  DetailsView,
  ShownInspection,
  ShownPicking,
  ShownTrace
} from '../common/graph-details.type.ts';
import type { InspectionInput, LinkInspection } from '../common/inspection.type.ts';
import { folderModelOf, linkModelOf, packageModelOf, pickingModelOf, traceModelOf } from '../utils/details-model.util.ts';

/** Builds the input a neighbour's Explain posts; a link always names its dependent first. */
type ExplainInputOf = (neighbour: string) => InspectionInput;

const START_TRACE: InspectionInput = { kind: 'startTrace' };

const CLEAR_TRACE: InspectionInput = { kind: 'clearTrace' };

const SWAP_ENDS: InspectionInput = { kind: 'swapEnds' };

const selectInput = (name: string): InspectionInput => {
  const input: InspectionInput = { kind: 'select', name, via: 'panel' };

  return input;
};

const explainInput = (source: string, target: string): InspectionInput => {
  const input: InspectionInput = { kind: 'explain', source, target };

  return input;
};

/** A click on an `aria-disabled` button does nothing; the attribute is read at click time, as updates move it. */
const onClick = (button: HTMLButtonElement, act: () => void): void => {
  button.addEventListener('click', (): void => {
    const disabled = button.getAttribute('aria-disabled');
    const isDisabled = disabled === 'true';

    if (!isDisabled) act();
  });
};

const wired = <View extends DetailsView>(view: View, env: DetailsEnv): View => {
  onClick(view.close, env.onClose);

  return view;
};

export const emptyOf = (env: DetailsEnv): EmptyDetails => wired(env.deps.views.empty(env.isOverlay), env);

const wireNeighbours = (items: NeighbourItem[], explainOf: ExplainInputOf, env: DetailsEnv): void => {
  const { onInput } = env.deps;

  for (const item of items) {
    onClick(item.pick, (): void => onInput(selectInput(item.name)));
    onClick(item.explain, (): void => onInput(explainOf(item.name)));
  }
};

const wirePackage = (view: PackageDetails, name: string, env: DetailsEnv): void => {
  const { deps } = env;
  const dependencyOf = (neighbour: string): InspectionInput => explainInput(name, neighbour);
  const dependentOf = (neighbour: string): InspectionInput => explainInput(neighbour, name);

  wireNeighbours(view.dependencies, dependencyOf, env);
  wireNeighbours(view.dependents, dependentOf, env);
  onClick(view.openDetails, (): void => deps.onOpenDetails(name));
  onClick(view.focus, (): void => deps.onFocus(name));
  onClick(view.exclude, (): void => deps.onExclude(name));
  onClick(view.startTrace, (): void => deps.onInput(START_TRACE));
  onClick(view.showTasks, (): void => deps.onShowTasks(name));
  view.showTasks.hidden = !deps.hasTasks(name);
};

const packageOf = (name: string, context: DetailsContext, env: DetailsEnv): DetailsView => {
  const model = packageModelOf(name, context);

  if (model === null) return emptyOf(env);

  const view = wired(env.deps.views.package(model, env.isOverlay), env);

  wirePackage(view, name, env);

  return view;
};

const linkOf = (inspection: LinkInspection, context: DetailsContext, env: DetailsEnv): DetailsView => {
  const { source, target } = inspection;
  const model = linkModelOf(source, target, context);
  const view = wired(env.deps.views.link(model, env.isOverlay), env);
  const { onInput } = env.deps;

  onClick(view.source, (): void => onInput(selectInput(source)));
  onClick(view.target, (): void => onInput(selectInput(target)));

  return view;
};

const pickingOf = (picking: ShownPicking, env: DetailsEnv): DetailsView => {
  const { start, candidates } = picking;
  const model = pickingModelOf(start, candidates, candidates);
  const view = wired(env.deps.views.picking(model, env.isOverlay), env);

  wirePicking(view, env);

  return view;
};

const wireTrace = (view: TraceDetails, env: DetailsEnv): void => {
  const { deps } = env;
  const onStep = (event: Event): void => {
    const button = namedButtonOf(event);
    const name = button?.dataset['name'];
    const action = button?.dataset['action'];

    if (name === undefined) return;

    if (action === 'select') deps.onInput(selectInput(name));

    if (action === 'show') deps.onShow(name);
  };

  view.steps.addEventListener('click', onStep);
  onClick(view.clear, (): void => deps.onInput(CLEAR_TRACE));
  onClick(view.swap, (): void => deps.onInput(SWAP_ENDS));
};

const traceOf = (traced: ShownTrace, context: DetailsContext, env: DetailsEnv): DetailsView => {
  const { visible, showable } = context;
  const model = traceModelOf(traced, traced.trace, visible, showable);
  const view = wired(env.deps.views.trace(model, env.isOverlay), env);

  wireTrace(view, env);

  return view;
};

const wireFolder = (view: FolderViewElements, folder: string, env: DetailsEnv): void => {
  const { deps } = env;

  for (const member of view.members) onClick(member.pick, (): void => deps.onInput(selectInput(member.name)));

  onClick(view.toggle, (): void => deps.onToggleFolder(folder));
  onClick(view.focus, (): void => deps.onFocusFolder(folder));
  onClick(view.exclude, (): void => deps.onExcludeFolder(folder));
};

const folderOf = (folder: string, context: DetailsContext, env: DetailsEnv): DetailsView => {
  const model = folderModelOf(folder, context, env.isOverlay);

  if (model === null) return emptyOf(env);

  const view = wired(env.deps.views.folder(model), env);

  wireFolder(view, folder, env);

  return view;
};

/** Builds the view for `inspection` with its listeners; one with nothing to show is the Empty view. */
export const wiredViewOf = (inspection: ShownInspection, context: DetailsContext, env: DetailsEnv): DetailsView => {
  switch (inspection.kind) {
    case 'none':
      return emptyOf(env);
    case 'package':
      return packageOf(inspection.name, context, env);
    case 'link':
      return linkOf(inspection, context, env);
    case 'folder':
      return folderOf(inspection.folder, context, env);
    case 'picking':
      return pickingOf(inspection, env);
    case 'trace':
      return traceOf(inspection, context, env);
  }
};

/** Each Open button reads its line at click time from `state()`, which in-place updates keep current; `missing` opens line 0. */
export const wireExplain = (details: ExplainDetails, source: string, state: () => ExplainState | null, env: DetailsEnv): void => {
  const { onOpenManifest } = env.deps;
  const lineAt = (index: number): number => {
    const shown = state();
    const entry = shown?.kind === 'found' ? shown.entries[index] : undefined;

    return entry?.line ?? 0;
  };

  details.entries.forEach((entry, index) => onClick(entry.open, (): void => onOpenManifest(source, lineAt(index))));

  if (details.open !== null) onClick(details.open, (): void => onOpenManifest(source, 0));
};
