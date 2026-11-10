/** Two packages where `owner` defines a task `other` lacks, and a task both define; read from the manifest, so a generator change fails loudly. */
export type FilterPair = { readonly owner: string; readonly other: string; readonly exclusive: string; readonly shared: string };
