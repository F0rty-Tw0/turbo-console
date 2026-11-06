import { updateExplain } from './graph-details-render.ts';
import { wireExplain } from './graph-details-wire.ts';
import type { GraphEdgeImportsMessage } from '../../bridge/common/graph-imports.type.ts';
import type { GraphEdgeExplainedMessage } from '../../bridge/common/graph-message.type.ts';
import type { ExplainState } from '../common/details.type.ts';
import type {
  DetailsEnv,
  DetailsView,
  GraphDetailsDeps,
  LookupReply,
  ShownExplain,
  ShownInspection
} from '../common/graph-details.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';
import type { LinkInspection } from '../common/inspection.type.ts';
import { explainPlanOf, explainStateOf, isReplyFor } from '../utils/explain-state.util.ts';
import { askedImportsOf, repliedImportsOf } from '../utils/imports-state.util.ts';

/**
 * The shown link's look-ups: asks the host for its manifest entry and its imports when a link view is built or a
 * same-hash state arrives, applies the reply for the shown link to the view's explain block, in place or rebuilt, and
 * holds its imports: the state is keyed by the shown link, never by ask; a link the host does not answer stays scanning
 * until a rebuild (spec D15, OQ6).
 */
export class LinkLookups {
  private readonly deps: GraphDetailsDeps;
  private readonly env: () => DetailsEnv;
  private explain: ShownExplain | null = null;
  private imports: ImportsState | null = null;

  public constructor(deps: GraphDetailsDeps, env: () => DetailsEnv) {
    this.deps = deps;
    this.env = env;
  }

  /** A view was built for `inspection`: its explain block and imports start empty, and a link is asked about. */
  public built(inspection: ShownInspection): void {
    this.explain = null;
    this.imports = null;

    if (inspection.kind === 'link') this.asked(inspection);
  }

  /** A same-hash state asks the host again about the shown link. */
  public reasked(link: LinkInspection): void {
    this.asked(link);
  }

  /** The imports of the shown link, `null` while no link is shown. */
  public importsState(): ImportsState | null {
    return this.imports;
  }

  /** A reply for the shown link: its manifest entry goes to the explain block, its imports to the held state. */
  public replied(message: LookupReply, view: DetailsView | null): void {
    switch (message.type) {
      case 'edgeExplained':
        this.explained(message, view);
        break;
      case 'edgeImports':
        this.imported(message);
        break;
    }
  }

  /** A reply for the shown link updates the explain block in place, or builds it again when its shape changed. */
  private explained(message: GraphEdgeExplainedMessage, view: DetailsView | null): void {
    const env = this.env();
    const shown = env.shown();
    const isReply = isReplyFor(message, shown);

    if (!isReply || view?.kind !== 'link') return;

    const state = explainStateOf(message.result, message.target);
    const isUpdated = this.updatedExplain(state);

    if (isUpdated) return;

    const hadFocus = view.explain.contains(document.activeElement);
    const details = this.deps.views.explain(state);

    view.explain.replaceChildren(details.root);
    this.explain = { state, details };
    wireExplain(details, message.source, (): ExplainState | null => this.explain?.state ?? null, env);

    if (hadFocus) view.heading.focus();
  }

  private imported(message: GraphEdgeImportsMessage): void {
    const isReply = isReplyFor(message, this.env().shown());

    if (isReply) this.imports = repliedImportsOf(message.result);
  }

  private asked(link: LinkInspection): void {
    this.imports = askedImportsOf(this.imports);
    this.deps.onExplain(link.source, link.target);
    this.deps.onScanImports(link.source, link.target);
  }

  private updatedExplain(state: ExplainState): boolean {
    const { explain } = this;

    if (explain === null) return false;

    const plan = explainPlanOf(explain.state, state);

    if (plan === 'rebuild') return false;

    updateExplain(explain.details, state);
    this.explain = { state, details: explain.details };

    return true;
  }
}
