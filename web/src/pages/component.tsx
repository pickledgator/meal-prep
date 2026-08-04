import { Link, useParams } from "wouter";
import { FolioHeader } from "@/components/plans/folio-header";
import { PrintButton } from "@/components/plans/print-button";
import { InlineMarkdown } from "@/components/inline-markdown";
import { HotTip, IngredientList, StepList } from "@/components/recipe-body";
import { PagePlaceholder, QueryError } from "@/components/page-states";
import { NotFound } from "@/pages/not-found";
import { useDocumentTitle, usePlan } from "@/lib/hooks";
import { stripLeadIn } from "@/lib/sections";

export function ComponentPage() {
  const { slug = "", id = "" } = useParams<{ slug: string; id: string }>();
  const { data: plan, isPending, error } = usePlan(slug);

  const componentSlug = id.replace(/\.md$/, "");
  const component = plan?.components.find((c) => c.slug === componentSlug);
  useDocumentTitle(component?.name);

  if (isPending) return <PagePlaceholder />;
  if (error) return <QueryError error={error} />;
  if (!component) return <NotFound />;

  const usedIn = plan.meals.filter((meal) => meal.componentSlugs.includes(component.slug));

  return (
    <div>
      <FolioHeader
        back={{ href: `/plans/${slug}/prep`, label: "Back to Sunday prep" }}
        kicker={`${component.type} · made ahead`}
        title={component.name}
        standfirst={component.intro}
        actions={<PrintButton label="Print card" />}
        meta={[
          ...(component.yieldText ? [<>Yields {component.yieldText}</>] : []),
          ...(component.attribution ? [<>{component.attribution}</>] : []),
        ]}
      />

      {usedIn.length > 0 && (
        <div className="slab-sunk mb-10 px-5 py-4">
          <p className="label mb-3 text-ink">Spent on</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {usedIn.map((meal) => (
              <li key={meal.id}>
                <Link href={`/plans/${slug}/recipes/m${meal.mealNumber}`} className="group flex items-baseline gap-2">
                  <span className="label bg-ink px-1.5 py-1 text-paper">m{meal.mealNumber}</span>
                  <span className="display-quiet text-[1.0625rem] text-ink transition-colors group-hover:text-primary">
                    {meal.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {component.notes && (
        <p className="measure mb-8 text-ink-muted">
          <InlineMarkdown text={component.notes} slug={slug} />
        </p>
      )}

      {component.hasCard ? (
        <>
          <IngredientList ingredients={component.ingredients} slug={slug} />
          <StepList steps={component.steps} slug={slug} />
        </>
      ) : (
        <p className="measure my-8 text-ink-muted">
          Made inline on prep day — the method lives on the{" "}
          <Link
            href={`/plans/${slug}/prep`}
            className="font-medium text-primary underline decoration-primary/35 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary"
          >
            Sunday prep list
          </Link>
          .
        </p>
      )}

      {component.hotTip && <HotTip text={stripLeadIn(component.hotTip, "Hot Tip")} slug={slug} />}

      {component.storageNote && (
        <div className="slab-sunk mt-10 px-5 py-4">
          <p className="label mb-2 text-ink">To store</p>
          <p className="text-[0.9375rem] text-ink-muted">
            <InlineMarkdown text={stripLeadIn(component.storageNote, "To Store")} slug={slug} />
          </p>
        </div>
      )}
    </div>
  );
}
