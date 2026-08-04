import { Link, useParams } from "wouter";
import { FolioHeader } from "@/components/plans/folio-header";
import { PlanNav } from "@/components/plans/plan-nav";
import { PrintButton } from "@/components/plans/print-button";
import { PagePlaceholder, QueryError } from "@/components/page-states";
import { categoryColor, formatWeek } from "@/lib/format";
import { useDocumentTitle, usePlan } from "@/lib/hooks";

export function PlanMenuPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: plan, isPending, error } = usePlan(slug);
  useDocumentTitle(plan?.theme);

  if (isPending) return <PagePlaceholder />;
  if (error) return <QueryError error={error} />;

  const totalMinutes = plan.meals.reduce(
    (sum, meal) => sum + (meal.prepTimeMinutes ?? 0) + (meal.cookTimeMinutes ?? 0),
    0,
  );

  return (
    <div>
      <FolioHeader
        kicker={`Week of ${formatWeek(plan.weekOf)}`}
        title={plan.theme}
        standfirst={plan.menuNote}
        actions={<PrintButton label="Print menu" />}
        meta={[
          <>{plan.meals.length} dinners</>,
          <>{plan.servings} servings</>,
          <>{plan.difficulty} prep</>,
          <>{totalMinutes} min of weeknight cooking</>,
          ...(plan.leftovers ? [<>with leftovers</>] : []),
        ]}
      />

      <PlanNav slug={slug} />

      {/* The menu, set as a tasting card */}
      <section aria-labelledby="menu-heading">
        <h2 id="menu-heading" className="label-lg mb-4 text-ink">
          The menu
        </h2>

        <ol className="-ml-4 space-y-1">
          {plan.meals.map((meal) => {
            const totalTime = (meal.prepTimeMinutes ?? 0) + (meal.cookTimeMinutes ?? 0);

            return (
              <li key={meal.id}>
                <Link
                  href={`/plans/${slug}/recipes/m${meal.mealNumber}`}
                  className="index-row grid grid-cols-[2.75rem_1fr] items-start gap-x-5 gap-y-3 py-7 pl-4 pr-2 sm:grid-cols-[3.5rem_1fr_11rem]"
                >
                  <span className="num-block size-10 text-base">{meal.mealNumber}</span>

                  <div className="min-w-0">
                    <h3 className="display text-[clamp(1.5rem,2.8vw,1.9rem)] text-ink">{meal.name}</h3>
                    {meal.subtitle && (
                      <p className="display-quiet mt-2 text-[1.0625rem] italic text-ink-muted">{meal.subtitle}</p>
                    )}
                    {meal.keyIngredients.length > 0 && (
                      <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-ink-faint">
                        {meal.keyIngredients.join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:gap-2 sm:pt-2">
                    <span className="label-lg text-ink">{totalTime} min</span>
                    <span className="data flex items-center gap-2 text-ink-muted sm:text-right">
                      <span className={categoryColor(meal.proteinCategory)} title={meal.proteinCategory}>
                        <span className="cat-dot" />
                      </span>
                      <span className="whitespace-nowrap">{meal.protein}</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Components — made once on Sunday, spent across the week */}
      {plan.components.length > 0 && (
        <section aria-labelledby="components-heading" className="mt-16">
          <h2 id="components-heading" className="label-lg mb-4 text-ink">
            Made on Sunday
          </h2>

          <ul className="-ml-4 space-y-0.5">
            {plan.components.map((component) => {
              const usedIn = plan.meals.filter((meal) => meal.componentSlugs.includes(component.slug));

              return (
                <li key={component.id}>
                  <Link
                    href={`/plans/${slug}/components/${component.slug}`}
                    className="index-row grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 py-4 pl-4 pr-2 sm:grid-cols-[1fr_10rem_auto]"
                  >
                    <span className="display-quiet text-[1.0625rem] text-ink">{component.name}</span>
                    <span className="data hidden text-ink-faint sm:block">{component.yieldText}</span>
                    <span className="flex items-center gap-1.5">
                      {usedIn.map((meal) => (
                        <span key={meal.id} className="label bg-ink px-1.5 py-1 text-paper">
                          m{meal.mealNumber}
                        </span>
                      ))}
                    </span>
                    <span className="data text-ink-faint sm:hidden">{component.yieldText}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
