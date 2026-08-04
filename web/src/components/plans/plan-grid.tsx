import type { PlanSummary } from "shared";
import { PlanRow } from "./plan-card";

interface PlanIndexProps {
  plans: PlanSummary[];
}

/** Empty archive — a composed first-run view rather than a shrug. */
function EmptyArchive() {
  return (
    <section className="slab px-6 py-12 sm:px-12">
      <p className="label text-primary">Nothing here yet</p>
      <h2 className="display-heavy mt-3.5 text-[clamp(1.875rem,4vw,2.5rem)] text-ink">
        Your first week starts in Claude Code.
      </h2>
      <p className="measure-tight mt-4 text-ink-muted">
        Run <code className="data rounded-sm bg-secondary px-1.5 py-0.5">/meal-prep</code> in the repo, approve the
        menu, and the finished plan — grocery list, Sunday prep, recipe cards — lands here on its own.
      </p>
    </section>
  );
}

export function PlanIndex({ plans }: PlanIndexProps) {
  if (plans.length === 0) {
    return <EmptyArchive />;
  }

  return (
    <ul className="-ml-4 space-y-0.5">
      {plans.map((plan) => (
        <PlanRow key={plan.slug} plan={plan} />
      ))}
    </ul>
  );
}
