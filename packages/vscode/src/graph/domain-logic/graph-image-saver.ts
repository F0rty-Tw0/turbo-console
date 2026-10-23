import { basename, join } from 'node:path';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { PNG_SIGNATURE } from '../common/graph.const.ts';
import type { GraphPorts } from '../common/graph.type.ts';

/**
 * Saves the PNG a graph page posts: the signature is checked first, then the user picks a file and the bytes are written.
 * One save runs at a time; a post that arrives while a dialog or write is open is dropped. Never rejects: a failed dialog
 * or write is logged and shown as an error message.
 */
export class GraphImageSaver {
  private readonly root: string;
  private readonly ports: GraphPorts;
  private isSaving = false;

  public constructor(root: string, ports: GraphPorts) {
    this.root = root;
    this.ports = ports;
  }

  public async save(png: string): Promise<void> {
    if (this.isSaving) {
      this.ports.log('Dropped a graph message: exportImage while a save is open');

      return;
    }

    const bytes = new Uint8Array(Buffer.from(png, 'base64'));
    const isPng = PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);

    if (!isPng) {
      this.ports.log('Dropped a graph message: exportImage that is not a PNG');
      this.ports.showError('The graph image was not a PNG.');

      return;
    }

    this.isSaving = true;

    try {
      await this.pickAndWrite(bytes);
    } catch (error: unknown) {
      const text = logTextOf(error);

      this.ports.log(text);
      this.ports.showError(`Could not save the graph image: ${text}`);
    } finally {
      this.isSaving = false;
    }
  }

  private async pickAndWrite(bytes: Uint8Array): Promise<void> {
    const defaultPath = join(this.root, `${basename(this.root)}-package-graph.png`);
    const path = await this.ports.pickSaveUri(defaultPath);

    if (path === null) return;

    await this.ports.writeBytes(path, bytes);
    this.ports.showInfo(`Saved the graph image to ${path}.`);
  }
}
