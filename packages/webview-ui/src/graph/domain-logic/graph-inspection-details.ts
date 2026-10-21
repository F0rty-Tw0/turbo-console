import type { GraphDetailsDeps } from '../common/graph-details.type.ts';
import type { GraphInspectionDeps, InspectionActions } from '../common/graph-inspection.type.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';

const CLEAR: InspectionInput = { kind: 'clear' };

const CANVAS_ESCAPE: InspectionInput = { kind: 'escape', where: 'canvas' };

/** The details panel's deps: its inputs go to `actions`, its host requests to the bridge, its list actions to the controls. */
export const detailsDepsOf = (deps: GraphInspectionDeps, actions: InspectionActions): GraphDetailsDeps => {
  const { bridge, page, view, views, overlay } = deps;
  const detailsDeps: GraphDetailsDeps = {
    page,
    views,
    overlay,
    onInput: (input): void => actions.input(input),
    onExplain: (source, target): void => bridge.post({ type: 'explainEdge', source, target }),
    onOpenDetails: (name): void => bridge.post({ type: 'openDetails', packageName: name }),
    onFocus: (name): void => deps.onFocusOn(name),
    onExclude: (name): void => deps.onExclude(name),
    onShow: (name): void => deps.onShow(name),
    onFilter: (text): void => actions.filter(text),
    onOpenManifest: (packageName, line): void => bridge.post({ type: 'openManifest', packageName, line }),
    onResize: (): void => view.resize(),
    // Task 3.5 gives these two their keep-clear pan.
    onLayout: (): void => undefined,
    onOpened: (): void => undefined,
    onSave: (): void => actions.save()
  };

  return detailsDeps;
};

const onKey = (event: KeyboardEvent, actions: InspectionActions): void => {
  if (event.repeat) return;

  if (event.key === 'Escape') actions.input(CANVAS_ESCAPE);

  if (event.key === 'Enter') actions.openDetails();
};

/** `Clear selection`, and Escape and Enter on the graph container only, so a key on a toolbar button never acts here. */
export const wireInspectionKeys = (page: PageElements, actions: InspectionActions): void => {
  page.clear.addEventListener('click', (): void => actions.input(CLEAR));
  page.container.addEventListener('keydown', (event: KeyboardEvent): void => onKey(event, actions));
};
