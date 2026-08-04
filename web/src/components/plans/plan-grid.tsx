import Link from "next/link";
import { PlanRow } from "./plan-card";
import type { PlanSummary } from "@/lib/types";

interface PlanIndexProps {
  plans: PlanSummary[];
}

/** Empty archive — a composed first-run view rather than a shrug. */
function EmptyArchive() {
  return (
    <section className="slab px-6 py-12 sm:px-12">
      <p className="label text-primary">Nothing here yet</p>
      <h2 className="display-heavy mt-3.5 text-[clamp(1.875rem,4vw,2.5rem)] text-ink">
        Your first week starts with three answers.
      </h2>
      <p className="measure-tight mt-4 text-ink-muted">
        How many dinners, how many servings, and anything in the fridge that
        needs using. The rest — menu, grocery list, Sunday prep, recipe cards —
        gets written for you.
      </p>

      <ol className="mt-9 max-w-md space-y-4">
        {[
          { step: "1", text: "Set meals, servings, and prep difficulty" },
          { step: "2", text: "Name proteins or produce to build around" },
          { step: "3", text: "Read the plan, shop once, cook all week" },
        ].map((item) => (
          <li
            key={item.step}
            className="flex items-center gap-4"
          >
            <span className="num-block size-7 text-[0.8125rem]">
              {item.step}
            </span>
            <span className="text-ink-muted">{item.text}</span>
          </li>
        ))}
      </ol>

      <Link
        href="/create"
        className="label mt-9 inline-flex items-center gap-2.5 bg-ink px-5 py-4 text-paper transition-colors duration-200 hover:bg-primary"
      >
        Plan a week
        <span aria-hidden>&rarr;</span>
      </Link>
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
        <PlanRow key={plan.folder_name} plan={plan} />
      ))}
    </ul>
  );
}

/** Kept for compatibility with any existing imports. */
export const PlanGrid = PlanIndex;
