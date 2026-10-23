import { basename, join } from 'node:path';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphPorts } from '../common/graph.type.ts';

/** The first eight bytes of every PNG file. */
const PNG_SIGNATURE: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** 12 base64 characters decode to 9 bytes, enough for the 8-byte signature. */
const SIGNATURE_CHARS = 12;

/** VS Code's `FileSystemError` message already starts with this, which the toast would show twice. */
const ERROR_PREFIX = /^Error: /;

/**
 * Saves the PNG a graph page posts: the signature is checked on the first characters before the rest is decoded, then
 * the user picks a file and the bytes are written.
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

    const head = Buffer.from(png.slice(0, SIGNATURE_CHARS), 'base64');
    const isPng = PNG_SIGNATURE.every((byte, index) => head[index] === byte);

    if (!isPng) {
      this.ports.log('Dropped a graph message: exportImage that is not a PNG');
      this.ports.showError('The graph image was not a PNG.');

      return;
    }

    const bytes = new Uint8Array(Buffer.from(png, 'base64'));

    this.isSaving = true;

    try {
      await this.pickAndWrite(bytes);
    } catch (error: unknown) {
      const text = logTextOf(error);
      const shown = text.replace(ERROR_PREFIX, '');

      this.ports.log(text);
      this.ports.showError(`Could not save the graph image: ${shown}`);
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
