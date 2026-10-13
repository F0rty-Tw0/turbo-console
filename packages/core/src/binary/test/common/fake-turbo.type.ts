/** Set `failNext` to make the next opened `FileHandle`'s `close()` reject. */
export type CloseFault = {
  // eslint-disable-next-line local/readonly-type-properties -- the spec arms it per case and the wrapper disarms it after one handle.
  failNext: boolean;
};
