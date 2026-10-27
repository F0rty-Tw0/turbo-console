/** A callback a fake observer was built with; a spec runs it to stand for the observer firing. */
export type TickRunner = () => void;

type ObserverSurface = { readonly observe: () => void };

/** A stand-in for `ResizeObserver` or `MutationObserver` that observes nothing. */
export type TickObserverClass = new (callback: TickRunner) => ObserverSurface;
