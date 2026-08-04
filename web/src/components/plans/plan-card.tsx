import Link from "next/link";
import { formatWeek, formatWeekShort, formatWeekYear } from "@/lib/format";
import type { Plan, PlanSummary } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Index row — the ruled list entry that replaced the card grid               */
/* -------------------------------------------------------------------------- */

export function PlanRow({ plan }: { plan: PlanSummary }) {
  return (
    <li>
      <Link
        href={`/plans/${plan.folder_name}`}
        className="index-row grid grid-cols-[4.75rem_1fr] items-baseline gap-x-5 gap-y-1.5 py-4 pl-4 pr-3 sm:grid-cols-[7rem_1fr_auto]"
      >
        <span className="data text-ink-muted">
          {formatWeekShort(plan.week_of)}
          <span className="ml-1.5 hidden text-ink-faint sm:inline">
            {formatWeekYear(plan.week_of)}
          </span>
        </span>

        <span className="display text-xl text-ink sm:text-[1.4rem]">
          {plan.theme}
        </span>

        <span className="data col-span-2 flex items-center gap-2.5 text-ink-muted sm:col-span-1 sm:justify-end">
          <span>{plan.meal_count} meals</span>
          <span className="text-rule-strong">·</span>
          <span>{plan.servings} servings</span>
          <span className="text-rule-strong">·</span>
          <span className="text-ink-faint">{plan.difficulty}</span>
        </span>
      </Link>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Feature — the most recent plan, given the room it deserves                  */
/* -------------------------------------------------------------------------- */

const CONTENTS = [
  { label: "Menu", href: "", note: "the week at a glance" },
  { label: "Grocery", href: "/grocery", note: "one shop, by aisle" },
  { label: "Prep", href: "/prep", note: "Sunday, top to bottom" },
  { label: "Essentials", href: "/essentials", note: "pantry & shortcuts" },
];

interface PlanFeatureProps {
  summary: PlanSummary;
  plan: Plan | null;
}

export function PlanFeature({ summary, plan }: PlanFeatureProps) {
  const base = `/plans/${summary.folder_name}`;
  const meals = plan?.meals ?? [];
  const totalMinutes = meals.reduce(
    (sum, meal) => sum + meal.prep_time_minutes + meal.cook_time_minutes,
    0
  );

  return (
    <article className="grid gap-x-14 gap-y-10 md:grid-cols-[1.45fr_1fr]">
      <div>
        <p className="label text-primary">Latest plan</p>

        <h2 className="display-heavy mt-3.5 text-[clamp(2.25rem,5.5vw,3.5rem)] text-ink">
          <Link href={base} className="transition-colors hover:text-primary">
            {summary.theme}
          </Link>
        </h2>

        <p className="data mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-ink-muted">
          <span>Week of {formatWeek(summary.week_of)}</span>
          <span className="text-rule-strong">·</span>
          <span>{summary.meal_count} dinners</span>
          <span className="text-rule-strong">·</span>
          <span>{summary.servings} servings</span>
        </p>

        {meals.length > 0 && (
          <ol className="-ml-4 mt-8 space-y-1">
            {meals.map((meal, index) => (
              <li key={meal.id}>
                <Link
                  href={`${base}/recipes/${meal.id}`}
                  className="index-row flex items-start gap-4 py-3.5 pl-4 pr-3"
                >
                  <span className="num-block mt-0.5 size-7 text-[0.8125rem]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="display-quiet block text-lg text-ink">
                      {meal.name}
                    </span>
                    {meal.subtitle && (
                      <span className="mt-1 block text-[0.9375rem] text-ink-muted">
                        {meal.subtitle}
                      </span>
                    )}
                  </span>
                  <span className="data hidden pt-1.5 text-ink-faint sm:block">
                    {meal.prep_time_minutes + meal.cook_time_minutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <Link
          href={base}
          className="label group mt-8 inline-flex items-center gap-2.5 border-b-2 border-ink pb-1.5 text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Open the full plan
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-1"
          >
            &rarr;
          </span>
        </Link>
      </div>

      {/* Spec rail */}
      <aside className="slab self-start p-7">
        <p className="label text-ink">Contents</p>

        <ul className="mt-5 space-y-3.5">
          {CONTENTS.map((entry) => (
            <li key={entry.label}>
              <Link
                href={`${base}${entry.href}`}
                className="group flex items-baseline justify-between gap-4"
              >
                <span className="display-quiet text-[1.0625rem] text-ink transition-colors group-hover:text-primary">
                  {entry.label}
                </span>
                <span className="data text-right text-ink-faint">
                  {entry.note}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <dl className="mt-8 space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="label text-ink-faint">Prep day</dt>
            <dd className="data text-ink">{summary.difficulty}</dd>
          </div>
          {plan && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label text-ink-faint">Components</dt>
              <dd className="data text-ink">{plan.components.length}</dd>
            </div>
          )}
          {totalMinutes > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="label text-ink-faint">Weeknight total</dt>
              <dd className="data text-ink">{totalMinutes} min</dd>
            </div>
          )}
        </dl>
      </aside>
    </article>
  );
}
