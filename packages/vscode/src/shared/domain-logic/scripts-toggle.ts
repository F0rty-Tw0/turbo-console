import { SCRIPTS_KEY } from '../common/scripts-toggle.const.ts';
import type { ScriptsToggleApi, ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';
import { logTextOf } from '../utils/log-text.util.ts';

/**
 * Whether the Packages view lists package.json scripts (spec 1c-b), stored per window. The constructor reads the stored
 * choice and sends the context key, so the view first draws with it set. `set` writes one after another, so two clicks
 * in flight cannot leave the store and the choice on different values. A write that fails midway can: the store keeps the
 * value while `isShown` and the key keep the old one until the next `set`.
 */
export class ScriptsToggle implements ScriptsToggleApi {
  private readonly ports: ScriptsTogglePorts;
  private readonly listeners = new Set<() => void>();
  private shown: boolean;
  private last: Promise<void> = Promise.resolve();

  public constructor(ports: ScriptsTogglePorts) {
    this.ports = ports;
    this.shown = ports.store.get(SCRIPTS_KEY) === true;

    ports.setKey(this.shown).then(undefined, (error: unknown) => {
      ports.log(logTextOf(error));
    });
  }

  public isShown(): boolean {
    return this.shown;
  }

  public async set(value: boolean): Promise<void> {
    const run = this.last.then(async () => this.write(value)).catch((error: unknown) => this.logAndRethrow(error));

    this.last = run.catch(() => undefined);

    return run;
  }

  public onDidChange(listener: () => void): () => void {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  }

  public dispose(): void {
    this.listeners.clear();
  }

  private async write(value: boolean): Promise<void> {
    await this.ports.store.update(SCRIPTS_KEY, value);
    await this.ports.setKey(value);
    this.shown = value;

    for (const listener of this.listeners) this.notify(listener);
  }

  private notify(listener: () => void): void {
    try {
      listener();
    } catch (error: unknown) {
      this.ports.log(logTextOf(error));
    }
  }

  private logAndRethrow(error: unknown): never {
    this.ports.log(logTextOf(error));

    throw error;
  }
}
