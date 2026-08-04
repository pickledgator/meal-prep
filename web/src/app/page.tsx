import Link from "next/link";
import { PlanFeature } from "@/components/plans/plan-card";
import { PlanIndex } from "@/components/plans/plan-grid";
import { getAllPlanSummaries, getPlan } from "@/lib/plans";
import { spellNumber, sentenceCase } from "@/lib/format";

export default async function HomePage() {
  const plans = await getAllPlanSummaries();
  const [latest, ...earlier] = plans;
  const latestPlan = latest ? await getPlan(latest.folder_name) : null;

  const count = plans.length;
  const headline =
    count === 0
      ? "No weeks on the shelf yet."
      : count === 1
        ? "One week on the shelf."
        : `${sentenceCase(spellNumber(count))} weeks on the shelf.`;

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Masthead */}
      <section>
        <p className="label text-primary">The archive</p>
        <h1 className="display-heavy mt-4 text-[clamp(2.75rem,7.5vw,5rem)] text-ink">
          {headline}
        </h1>

        <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
          <p className="measure-tight text-ink-muted">
            Each plan keeps its menu, grocery list, Sunday prep, and recipe
            cards in one place. Newest first.
          </p>

          <Link
            href="/create"
            className="label inline-flex shrink-0 items-center gap-2.5 bg-ink px-5 py-4 text-paper transition-colors duration-200 hover:bg-primary"
          >
            Plan a week
            <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </section>

      {latest && <PlanFeature summary={latest} plan={latestPlan} />}

      {earlier.length > 0 && (
        <section>
          <h2 className="label-lg mb-4 text-ink">
            Earlier weeks
            <span className="ml-2.5 font-normal text-ink-faint">
              {earlier.length}
            </span>
          </h2>
          <PlanIndex plans={earlier} />
        </section>
      )}

      {!latest && <PlanIndex plans={plans} />}
    </div>
  );
}
