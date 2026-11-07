import { isAriaDisabled } from './graph-details-wire-parts.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { IMPORTS_FOLD_AT, IMPORTS_STATUS_DELAY_MS } from '../common/details-imports.const.ts';
import type { ImportRowElements, ImportsDetails } from '../common/details-view.type.ts';
import type { DetailsViews } from '../common/details.type.ts';
import type { DetailsView, GraphDetailsDeps, ShownInspection } from '../common/graph-details.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';
import { closestButtonOf } from '../utils/closest-button.util.ts';
import { isReplyFor } from '../utils/explain-state.util.ts';
import { importsModelOf } from '../utils/imports-model.util.ts';

type ImportsBlockDeps = Pick<GraphDetailsDeps, 'views' | 'onOpenImport'>;

/** A link view's `imports` slot and the writer of the live status line that stays in it across draws. */
type ImportsMount = {
  readonly slot: HTMLElement;
  readonly writeStatus: (text: string) => void;
};

/** The last draw: its elements, and the state and link it was drawn from. */
type ImportsDraw = {
  readonly details: ImportsDetails;
  readonly state: ImportsState;
  readonly link: GraphEdge;
};

type RowsByButton = Map<HTMLButtonElement, ImportRowElements>;

/** The focus key of any focus inside the block but on a row; a row key is `file:line`, so no row matches it. */
const SCAN_KEY = 'scan';

/** The focus key Show more redraws with, wherever focus was: the first row past the fold, else Scan again. */
const MORE_KEY = 'more';

/**
 * The writer of a new status line: it holds the text until `IMPORTS_STATUS_DELAY_MS` after the line is mounted, since a
 * `role=status` line inserted and filled in one task is often not read out, then writes it at once; a write that
 * changes nothing is skipped, so a same-text redraw is not read out again. A line dropped with its view before the delay
 * still gets its text, off the page, where no screen reader reads it.
 */
const statusWriterOf = (status: HTMLElement): ((text: string) => void) => {
  let held = '';
  let isLive = false;
  const written = (): void => {
    if (status.textContent !== held) status.textContent = held;
  };
  const wentLive = (): void => {
    isLive = true;
    written();
  };

  setTimeout(wentLive, IMPORTS_STATUS_DELAY_MS);

  return (text: string): void => {
    held = text;

    if (isLive) written();
  };
};

/** Appends a new status line to a link view's `imports` slot; `null`, and nothing appended, for any other view. */
const mountedSlotOf = (view: DetailsView, views: DetailsViews): ImportsMount | null => {
  if (view.kind !== 'link') return null;

  const status = views.importsStatus();
  const writeStatus = statusWriterOf(status);
  const mount: ImportsMount = { slot: view.imports, writeStatus };

  view.imports.append(status);

  return mount;
};

/** One swap per draw: the new root replaces the old one, or follows the status line on the first draw. */
const swapped = (mount: ImportsMount, previous: ImportsDraw | null, root: HTMLElement): void => {
  const old = previous?.details.root;

  if (old === undefined) mount.slot.append(root);
  else old.replaceWith(root);
};

/** The row a focus key lands on: the first row past the fold for `MORE_KEY`, else the first row of `key`. */
const rowFor = (details: ImportsDetails, key: string): ImportRowElements | undefined => {
  if (key === MORE_KEY) return details.rows[IMPORTS_FOLD_AT];

  return details.rows.find((each) => each.site.key === key);
};

/** Focus goes to the row of `key`, else to Scan again (spec D15); a `null` key leaves focus where it is. */
const refocused = (details: ImportsDetails, key: string | null): void => {
  if (key === null) return;

  const row = rowFor(details, key);
  const target = row?.button ?? details.scanAgain;

  target.focus();
};

/**
 * The shown link's imports block: draws it from the held state on every ask and reply (spec D15, no in-place update),
 * wires Scan again, the rows and the fold, and keeps focus on the same row or on Scan again.
 */
export class ImportsBlock {
  private readonly deps: ImportsBlockDeps;
  private readonly onRescan: (link: GraphEdge) => void;
  private mount: ImportsMount | null = null;
  private last: ImportsDraw | null = null;
  private openLink: GraphEdge | null = null;

  public constructor(deps: ImportsBlockDeps, onRescan: (link: GraphEdge) => void) {
    this.deps = deps;
    this.onRescan = onRescan;
  }

  /** A view was built for `inspection`: a link view's slot takes the status line; the fold stays open only for the same link (OQ2). */
  public mounted(view: DetailsView, inspection: ShownInspection): void {
    this.mount = mountedSlotOf(view, this.deps.views);
    this.last = null;

    const { openLink } = this;

    if (openLink === null) return;

    const isSameLink = isReplyFor(openLink, inspection);

    if (!isSameLink) this.openLink = null;
  }

  /** Draws `state` of `link` in the mounted slot, if any: reads focus, swaps once, then hands the status line its text and moves focus. */
  public drawn(state: ImportsState, link: GraphEdge): void {
    const key = this.focusKeyOf();

    this.redrawn(state, link, key);
  }

  /** One draw with focus going to `key` after the swap (`null` leaves focus where it is). */
  private redrawn(state: ImportsState, link: GraphEdge, key: string | null): void {
    const { mount } = this;

    if (mount === null) return;

    const isOpen = this.isOpenFor(link);
    const model = importsModelOf(state, link, isOpen);
    const details = this.deps.views.imports(model);
    const draw: ImportsDraw = { details, state, link };

    swapped(mount, this.last, details.root);
    mount.writeStatus(model.statusText);
    this.wire(draw);
    refocused(details, key);
    this.last = draw;
  }

  /** One delegated listener per draw: a row opens its site, Show more opens the fold, Scan again asks again. */
  private wire(draw: ImportsDraw): void {
    const { details } = draw;
    const pairs = details.rows.map((row): [HTMLButtonElement, ImportRowElements] => [row.button, row]);
    const rows: RowsByButton = new Map(pairs);
    const onClicked = (event: Event): void => {
      this.clicked(event, draw, rows);
    };

    details.root.addEventListener('click', onClicked);
  }

  private clicked(event: Event, draw: ImportsDraw, rows: RowsByButton): void {
    const { details, link } = draw;
    const button = closestButtonOf(event, 'button');

    if (button === null) return;

    const isDisabled = isAriaDisabled(button);

    if (isDisabled) return;

    const row = rows.get(button);

    if (row !== undefined) this.deps.onOpenImport(link.source, row.site.file, row.site.line);
    else if (button === details.more) this.opened(draw);
    else if (button === details.scanAgain) this.onRescan(link);
  }

  /** Show more: the fold opens for the drawn link and the block is drawn again with focus past the fold, even when the click did not focus Show more (Safari, Firefox on macOS). */
  private opened(draw: ImportsDraw): void {
    this.openLink = draw.link;
    this.redrawn(draw.state, draw.link, MORE_KEY);
  }

  /** A row's key when a drawn row has focus, `SCAN_KEY` for any other focus inside the block (Show more included), else `null`. */
  private focusKeyOf(): string | null {
    const { last } = this;

    if (last === null) return null;

    const { details } = last;
    const active = document.activeElement;
    const row = details.rows.find((each) => each.button === active);

    if (row !== undefined) return row.site.key;

    const isInside = details.root.contains(active);

    return isInside ? SCAN_KEY : null;
  }

  /** Whether the fold is open for `link`: by its names, since a reply and the inspection are different objects. */
  private isOpenFor(link: GraphEdge): boolean {
    const { openLink } = this;

    if (openLink === null) return false;

    return openLink.source === link.source && openLink.target === link.target;
  }
}
