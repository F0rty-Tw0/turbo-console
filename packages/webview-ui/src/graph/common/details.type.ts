import type {
  DetailsElements,
  EmptyDetails,
  ExplainDetails,
  LinkDetails,
  PackageDetails,
  PickingDetails,
  TraceDetails
} from './details-view.type.ts';
import type { GraphIconId } from './graph-icon.type.ts';
import type { TraceDirection } from './trace.type.ts';
import type { ManifestEntry } from '../../bridge/common/graph-message.type.ts';

/** One line of the empty view's guide: an icon, what can be selected, and how. */
export type GuideItem = {
  readonly icon: GraphIconId;
  readonly name: string;
  readonly text: string;
};

/** A piece of copy: plain text, or a key name drawn as a `kbd`. */
export type KeyedPart = {
  readonly text: string;
  readonly isKey: boolean;
};

/** One row of a manifest excerpt: its 1-based line number, its text, and whether it is the entry's own line. */
export type ExcerptRow = {
  readonly number: number;
  readonly text: string;
  readonly isEntry: boolean;
};

/** A dependency or dependent in a package's lists; a hidden one cannot be picked or explained. */
export type NeighbourModel = {
  readonly name: string;
  readonly isVisible: boolean;
};

export type PackageViewModel = {
  readonly name: string;
  readonly path: string;
  readonly tags: string[];
  readonly taskCount: number;
  readonly isFocused: boolean;
  readonly dependencies: NeighbourModel[];
  readonly dependents: NeighbourModel[];
};

/** A link: `source` depends on `target`, whose entry is looked up in `file`. */
export type LinkViewModel = {
  readonly source: string;
  readonly target: string;
  readonly file: string;
};

export type ReadingExplain = { readonly kind: 'reading'; readonly file: string };

export type FoundExplain = { readonly kind: 'found'; readonly file: string; readonly entries: ManifestEntry[] };

export type MissingExplain = { readonly kind: 'missing'; readonly file: string; readonly target: string };

export type UnreadableExplain = { readonly kind: 'unreadable'; readonly file: string };

/** Where the link's manifest lookup is: still reading, the entries found, none naming the target, or the file unreadable. */
export type ExplainState = ReadingExplain | FoundExplain | MissingExplain | UnreadableExplain;

/** The candidate groups while picking a trace end: dependencies of the start, its dependents, and the unrelated. */
export type CandidateKey = 'forward' | 'backward' | 'none';

/** A trace-end candidate; `steps` is `null` in the `none` group. */
export type CandidateModel = {
  readonly name: string;
  readonly steps: number | null;
};

/** `total` is the group's size before the filter, `items` what the filter leaves. */
export type CandidateGroupModel = {
  readonly key: CandidateKey;
  readonly total: number;
  readonly items: CandidateModel[];
};

/** `groups` always holds the three groups, in `CandidateKey` order. */
export type PickingViewModel = {
  readonly start: string;
  readonly groups: CandidateGroupModel[];
};

/** A package on the trace; a hidden one is a ghost, and `isShowable` when Show can bring it back. */
export type TraceStepModel = {
  readonly name: string;
  readonly isVisible: boolean;
  readonly isShowable: boolean;
};

export type TraceViewModel = {
  readonly start: string;
  readonly end: string;
  readonly direction: TraceDirection;
  readonly steps: TraceStepModel[];
};

/** The view builders `main.ts` hands to `GraphDetails`, since `domain-logic` may not import `ui`. */
// eslint-disable-next-line local/no-unused-exports -- first imported by Task 3.3
export type DetailsViews = {
  readonly build: () => DetailsElements;
  readonly empty: (isOverlay: boolean) => EmptyDetails;
  readonly package: (model: PackageViewModel, isOverlay: boolean) => PackageDetails;
  readonly link: (model: LinkViewModel, isOverlay: boolean) => LinkDetails;
  readonly explain: (state: ExplainState) => ExplainDetails;
  readonly picking: (model: PickingViewModel, isOverlay: boolean) => PickingDetails;
  readonly trace: (model: TraceViewModel, isOverlay: boolean) => TraceDetails;
  readonly hint: (start: string, isNudged: boolean) => HTMLElement;
  readonly candidateItems: (group: CandidateGroupModel) => HTMLLIElement[];
  readonly stepItems: (steps: TraceStepModel[]) => HTMLLIElement[];
};
