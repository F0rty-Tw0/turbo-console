import type { TurboErrorKind } from './turbo-error.type.ts';

/**
 * The only error core's public API throws. `cause` holds the original error where one exists, for debugging only:
 * never show or log it verbatim, since an execFile error's message and the `stderr` `runTurbo` attaches to it hold
 * all of turbo's raw stderr; the message here carries only its plain 20-line tail.
 */
export class TurboException extends Error {
  public override readonly name = 'TurboException';
  public readonly kind: TurboErrorKind;

  public constructor(kind: TurboErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.kind = kind;
  }
}
