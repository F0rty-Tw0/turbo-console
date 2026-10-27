import type { TextPosition } from '../../shared/common/text-position.type.ts';

/** The package row, or a task row of it, that Open, Reveal or Copy Path was invoked on. */
export type PackageTarget = {
  readonly root: string;
  readonly packageName: string;
};

/** The text range Open package.json selects and reveals: a script's property. */
export type TextSelection = {
  readonly start: TextPosition;
  readonly end: TextPosition;
};

/**
 * Editor effects of the package actions: read a file as the editor holds it (`null` when it cannot be read), open a file
 * with `selection` selected and revealed (`null` leaves the editor's own state), reveal a directory in the Explorer, copy text.
 */
export type PackageActionPorts = {
  readonly read: (file: string) => Promise<string | null>;
  readonly open: (file: string, selection: TextSelection | null) => Promise<void>;
  readonly reveal: (directory: string) => Promise<void>;
  readonly copy: (text: string) => Promise<void>;
};
