import * as vscode from 'vscode';

import type { Output } from '../common/output.type.ts';

type Write = (line: string) => void;

/** A load's failure path logs through here, and `LoadDeps.log` must not throw. */
const safely = (write: Write): Write => {
  const guarded = (line: string): void => {
    try {
      write(line);
    } catch {
      // A channel that cannot be written has nowhere to report the failure to.
    }
  };

  return guarded;
};

/** The "Turbo Console" `LogOutputChannel`; every line written is already clean (`logTextOf`, `cleanLines`). */
export const createOutput = (): Output => {
  const channel = vscode.window.createOutputChannel('Turbo Console', { log: true });
  const error = safely((line) => {
    channel.error(line);
  });
  const warn = safely((line) => {
    channel.warn(line);
  });
  const info = safely((line) => {
    channel.info(line);
  });
  const output: Output = {
    error,
    warn,
    info,
    show: () => {
      channel.show(true);
    },
    dispose: () => {
      channel.dispose();
    }
  };

  return output;
};
