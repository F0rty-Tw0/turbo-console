export type ScriptUrlPolicy = {
  /** The policy's script URL for `blobUrl`, a blob URL of the page's origin; the policy refuses every other URL, and this one once the call returns. */
  readonly urlFor: (blobUrl: string) => string;
};
