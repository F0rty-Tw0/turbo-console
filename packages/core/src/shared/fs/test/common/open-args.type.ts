import type { Mode, PathLike } from 'node:fs';

/** The arguments of `open` from `node:fs/promises`, which exports no type for them. */
export type OpenArgs = [path: PathLike, flags?: string | number, mode?: Mode];
