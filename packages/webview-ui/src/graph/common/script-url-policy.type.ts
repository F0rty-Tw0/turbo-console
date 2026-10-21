export type ScriptUrlPolicy = {
  /** The policy's script URL for `blobUrl`; the policy refuses every other URL, and this one once the call returns. */
  readonly urlFor: (blobUrl: string) => string;
};
