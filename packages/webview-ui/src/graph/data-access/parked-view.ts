import type { LayoutScreen } from '../common/graph-layouts.type.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';

type Gate = <Args extends unknown[]>(write: (...args: Args) => void) => (...args: Args) => void;

/** Wraps a write so it does nothing while `isParked()`. */
const gateOf = (isParked: () => boolean): Gate => {
  const gated = <Args extends unknown[]>(write: (...args: Args) => void): ((...args: Args) => void) => {
    const call = (...args: Args): void => {
      const isSkipped = isParked();

      if (isSkipped) return;

      write(...args);
    };

    return call;
  };

  return gated;
};

/**
 * The view the package graph draws through. While `isParked()` (task mode owns the canvas) its writes do nothing and
 * `viewport()` answers the last camera it read unparked, so a late package layout, paint or camera save never touches the
 * task graph; reads, the theme and the task canvas pass through.
 */
export const parkedViewOf = (view: GraphView, isParked: () => boolean): GraphView => {
  let last: Viewport | null = null;
  const gated = gateOf(isParked);
  const viewport = (): Viewport => {
    const isFrozen = isParked();

    if (isFrozen) return last ?? view.viewport();

    last = view.viewport();

    return last;
  };
  const parked: GraphView = {
    ...view,
    setGraph: gated(view.setGraph),
    paint: gated(view.paint),
    fit: gated(view.fit),
    setVisible: gated(view.setVisible),
    setGhosts: gated(view.setGhosts),
    centreOn: gated(view.centreOn),
    panBy: gated(view.panBy),
    viewport,
    setViewport: gated(view.setViewport),
    setGrouping: gated(view.setGrouping),
    setPositions: gated(view.setPositions),
    showFolders: gated(view.showFolders)
  };

  return parked;
};

/**
 * The screen the package layouts report through. While `isParked()` a late package layout's loading line, graph switch or
 * fallback notice does nothing, so it never covers the task graph.
 */
export const parkedScreenOf = (screen: LayoutScreen, isParked: () => boolean): LayoutScreen => {
  const gated = gateOf(isParked);
  const parked: LayoutScreen = {
    showLoading: gated(screen.showLoading),
    showGraph: gated(screen.showGraph),
    showNotice: gated(screen.showNotice)
  };

  return parked;
};
