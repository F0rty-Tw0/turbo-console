/** A media query a spec flips: `flip` sets `matches` and runs the query's `change` listeners. */
export type SwitchableMediaQueryMock = {
  readonly query: MediaQueryList;
  readonly flip: (matches: boolean) => void;
};
