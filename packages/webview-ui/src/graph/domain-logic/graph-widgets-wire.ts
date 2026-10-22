import { GraphWidgets } from './graph-widgets.ts';
import type { GraphWidgetsDeps, WidgetWireDeps, WidgetWiring } from '../common/graph-widgets.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';

const DETAILS_SELECTOR = '#graph-details';

/** A record that can move the container or the overlay: a direct child of the body shown or hidden. */
const isBodyRecord = (record: MutationRecord, body: HTMLElement): boolean => record.target.parentNode === body;

/**
 * Builds the widget layer and re-reads its bounds when the container resizes, the overlay query flips, or a panel of the
 * body opens or closes; a `hidden` flip deeper in the body (a list row) costs nothing. The details panel mounts with the
 * first graph, which also shows the container, so the resize covers it.
 */
export const wireWidgets = (deps: WidgetWireDeps): WidgetWiring => {
  const { page, overlay, canAct } = deps;
  const { body, container } = page;
  const layerDeps: GraphWidgetsDeps = {
    ...deps,
    aside: (): HTMLElement | null => body.querySelector<HTMLElement>(DETAILS_SELECTOR),
    isActive: canAct
  };
  const widgets = new GraphWidgets(layerDeps);
  const refreshBounds = (): void => widgets.refreshBounds();
  const onMutations = (records: MutationRecord[]): void => {
    const isBodyChange = records.some((record) => isBodyRecord(record, body));

    if (isBodyChange) refreshBounds();
  };
  const wiring: WidgetWiring = {
    refresh: (): void => widgets.refresh(),
    position: (): void => widgets.position(),
    buttonBox: (): AnchorBox | null => widgets.packageButtonBox()
  };

  new ResizeObserver(refreshBounds).observe(container);
  new MutationObserver(onMutations).observe(body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  overlay.addEventListener('change', refreshBounds);

  return wiring;
};
