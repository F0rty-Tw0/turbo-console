import type { BodyRecord, LayerBoundsWatch } from '../common/graph-widgets.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import type { LayerBounds } from '../common/widget.type.ts';
import { overlayLeftOf } from '../utils/widget-geometry.util.ts';

type WatchPage = Pick<PageElements, 'body' | 'container'>;

/** The container's size and, while `aside` overlays the canvas, its left edge in container px. */
export const readLayerBounds = (container: HTMLElement, aside: HTMLElement | null, isOverlay: boolean): LayerBounds => {
  const { offsetWidth, offsetHeight } = container;
  const overlayLeft = overlayLeftOf(aside, container, isOverlay);
  const bounds: LayerBounds = { width: offsetWidth, height: offsetHeight, overlayLeft };

  return bounds;
};

/** A record that can move the container or the overlay: a direct child of the body shown or hidden. */
const isBodyRecord = (record: BodyRecord, body: HTMLElement): boolean => record.target.parentNode === body;

/**
 * Observes the container and the Details aside for a resize. The aside mounts with the first graph, so it is looked up on
 * every trigger and observed the first time it exists; a Details drag over the canvas moves the aside's left edge
 * without resizing the container.
 */
class SizeWatch {
  private readonly aside: () => HTMLElement | null;
  private readonly onChange: () => void;
  private readonly resizes = new ResizeObserver((): void => this.trigger());
  private observed: Element | null = null;

  public constructor(aside: () => HTMLElement | null, onChange: () => void) {
    this.aside = aside;
    this.onChange = onChange;
  }

  public observe(element: Element): void {
    this.resizes.observe(element);
  }

  public observeAside(): void {
    const aside = this.aside();

    if (aside === null || aside === this.observed) return;

    this.resizes.observe(aside);
    this.observed = aside;
  }

  public trigger(): void {
    this.observeAside();
    this.onChange();
  }
}

/**
 * Calls `onChange` when the layer's bounds may have moved: the container or the Details aside resizes, a direct child of
 * the body is shown or hidden (a `hidden` flip deeper in the body, a list row, costs nothing), or the overlay query flips.
 * `onChange` reads whatever bounds its caller needs, through `readLayerBounds`.
 */
export const watchLayerBounds = (
  page: WatchPage,
  overlay: MediaQueryList,
  aside: () => HTMLElement | null,
  onChange: () => void
): LayerBoundsWatch => {
  const { body, container } = page;
  const sizes = new SizeWatch(aside, onChange);
  const onMutations = (records: BodyRecord[]): void => {
    const isBodyChange = records.some((record) => isBodyRecord(record, body));

    if (isBodyChange) sizes.trigger();
  };
  const watch: LayerBoundsWatch = { observeAside: (): void => sizes.observeAside() };

  sizes.observe(container);
  sizes.observeAside();
  new MutationObserver(onMutations).observe(body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  overlay.addEventListener('change', (): void => sizes.trigger());

  return watch;
};
