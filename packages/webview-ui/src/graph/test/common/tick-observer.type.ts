/** A callback a fake observer was built with; a spec runs it to stand for the observer firing, with `Args` as its records. */
export type TickRunner<Args extends unknown[] = []> = (...args: Args) => void;

/** The arguments of one `observe` call: the element, and the options a MutationObserver is given. */
export type ObserveCall = [element: Element, options?: MutationObserverInit];

type ObserverSurface = { readonly observe: (...call: ObserveCall) => void };

/** A stand-in for `ResizeObserver` or `MutationObserver` that observes nothing. */
export type TickObserverClass<Args extends unknown[] = []> = new (callback: TickRunner<Args>) => ObserverSurface;
