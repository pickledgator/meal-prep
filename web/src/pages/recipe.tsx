import { Link, useParams } from "wouter";
import { FolioHeader } from "@/components/plans/folio-header";
import { PrintButton } from "@/components/plans/print-button";
import { InlineMarkdown } from "@/components/inline-markdown";
import { HotTip, IngredientList, StepList } from "@/components/recipe-body";
import { PagePlaceholder, QueryError } from "@/components/page-states";
import { NotFound } from "@/pages/not-found";
import { categoryColor } from "@/lib/format";
import { useDocumentTitle, usePlan } from "@/lib/hooks";
import { stripLeadIn } from "@/lib/sections";

export function RecipePage() {
  const { slug = "", id = "" } = useParams<{ slug: string; id: string }>();
  const { data: plan, isPending, error } = usePlan(slug);

  // Links arrive as either `m1` or a full `m1-chicken-caesar` filename slug.
  const mealNumber = Number(id.match(/^m(\d+)/)?.[1] ?? NaN);
  const meal = plan?.meals.find((m) => m.mealNumber === mealNumber);
  useDocumentTitle(meal?.name);

  if (isPending) return <PagePlaceholder />;
  if (error) return <QueryError error={error} />;
  if (!meal) return <NotFound />;

  const totalTime = (meal.prepTimeMinutes ?? 0) + (meal.cookTimeMinutes ?? 0);
  const components = meal.componentSlugs
    .map((componentSlug) => plan.components.find((c) => c.slug === componentSlug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div>
      <FolioHeader
        back={{ href: `/plans/${slug}`, label: `Back to ${plan.theme}` }}
        kicker={`Meal ${meal.mealNumber}${meal.cuisine ? ` · ${meal.cuisine}` : ""}`}
        title={meal.name}
        standfirst={meal.subtitle}
        actions={<PrintButton label="Print recipe" />}
        meta={[
          ...(totalTime > 0 ? [<>{totalTime} min on the night</>] : []),
          ...(meal.yieldLine ? [<>{meal.yieldLine}</>] : []),
          <span key="protein" className="flex items-center gap-2">
            <span className={categoryColor(meal.proteinCategory)}>
              <span className="cat-dot" />
            </span>
            {meal.protein}
          </span>,
        ]}
      />

      {meal.preppedIngredients.length > 0 && (
        <div className="slab-sunk mb-10 px-5 py-4">
          <p className="label mb-3 text-ink">From your Sunday prep</p>
          <ul className="space-y-1.5 text-[0.9375rem] text-ink-muted">
            {meal.preppedIngredients.map((item, index) => {
              // The link itself carries the component reference — drop a
              // trailing "— `components/x.md`" so the raw path never shows.
              const display = item.componentSlug
                ? item.text.replace(/\s*[—–-]?\s*`components\/[^`]+`\s*$/, "")
                : item.text;
              return (
                <li key={index}>
                  {item.componentSlug ? (
                    <Link
                      href={`/plans/${slug}/components/${item.componentSlug}`}
                      className="font-medium text-primary underline decoration-primary/35 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary"
                    >
                      <InlineMarkdown text={display} />
                    </Link>
                  ) : (
                    <InlineMarkdown text={display} slug={slug} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <IngredientList ingredients={meal.ingredients} slug={slug} />
      <StepList steps={meal.steps} slug={slug} />

      {meal.hotTip && <HotTip text={stripLeadIn(meal.hotTip, "Hot Tip")} slug={slug} />}

      {meal.servingSuggestion && (
        <p className="measure my-6 text-ink-muted">
          <strong className="font-semibold text-ink">Serving suggestion: </strong>
          <InlineMarkdown text={stripLeadIn(meal.servingSuggestion, "Serving Suggestion")} slug={slug} />
        </p>
      )}

      {components.length > 0 && (
        <section className="mt-16" aria-labelledby="recipe-components">
          <h2 id="recipe-components" className="label-lg mb-4 text-ink">
            Components in this dish
          </h2>

          <ul className="-ml-4 space-y-0.5">
            {components.map((component) => (
              <li key={component.id}>
                <Link
                  href={`/plans/${slug}/components/${component.slug}`}
                  className="index-row group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 pl-4 pr-2"
                >
                  <span className="display-quiet text-[1.0625rem] text-ink transition-colors group-hover:text-primary">
                    {component.name}
                  </span>
                  <span className="data text-ink-faint">{component.yieldText}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
