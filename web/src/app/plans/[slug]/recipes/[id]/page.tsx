import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { FolioHeader } from "@/components/plans/folio-header";
import { PrintButton } from "@/components/plans/print-button";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getRecipeFile } from "@/lib/plans";
import { extractFolio } from "@/lib/markdown";
import { categoryColor } from "@/lib/format";

interface RecipePageProps {
  params: Promise<{ slug: string; id: string }>;
}

/** Links arrive as either `m1` or the full `m1-chicken-caesar` filename. */
function mealIdFrom(id: string): string {
  return id.match(/^m\d+/)?.[0] ?? id;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const plan = await getPlan(slug);
  const meal = plan?.meals.find((m) => m.id === mealIdFrom(id));
  if (!meal) return { title: "Recipe" };
  return {
    title: meal.name,
    description: `${meal.name} — ${meal.subtitle}. ${meal.key_ingredients.join(", ")}.`,
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug, id } = await params;
  const plan = await getPlan(slug);
  const recipeContent = await getRecipeFile(slug, id);

  if (!plan || !recipeContent) {
    notFound();
  }

  const meal = plan.meals.find((m) => m.id === mealIdFrom(id));
  const mealNumber = meal ? plan.meals.findIndex((m) => m.id === meal.id) + 1 : null;
  const folio = extractFolio(recipeContent);
  const totalTime = meal
    ? meal.prep_time_minutes + meal.cook_time_minutes
    : null;

  const components = (meal?.components ?? [])
    .map((componentId) => ({
      id: componentId,
      detail: plan.components.find((c) => c.id === componentId),
    }))
    .filter((entry) => entry.detail);

  return (
    <div>
      <FolioHeader
        back={{ href: `/plans/${slug}`, label: `Back to ${plan.theme}` }}
        kicker={
          mealNumber
            ? `Meal ${mealNumber}${meal?.cuisine ? ` · ${meal.cuisine}` : ""}`
            : plan.theme
        }
        title={folio.title ?? meal?.name ?? "Recipe"}
        standfirst={folio.notes[0]}
        actions={<PrintButton label="Print recipe" />}
        meta={[
          ...(totalTime ? [<>{totalTime} min on the night</>] : []),
          ...(folio.notes[1] ? [<>{folio.notes[1]}</>] : []),
          ...(meal
            ? [
                <span key="protein" className="flex items-center gap-2">
                  <span className={categoryColor(meal.protein_category)}>
                    <span className="cat-dot" />
                  </span>
                  {meal.protein}
                </span>,
              ]
            : []),
        ]}
      />

      <MealPrepMarkdown content={folio.body} slug={slug} />

      {components.length > 0 && (
        <section className="mt-16" aria-labelledby="recipe-components">
          <h2 id="recipe-components" className="label-lg mb-4 text-ink">
            Components in this dish
          </h2>

          <ul className="-ml-4 space-y-0.5">
            {components.map(({ id: componentId, detail }) => (
              <li key={componentId}>
                <Link
                  href={`/plans/${slug}/components/${componentId}`}
                  className="index-row group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 pl-4 pr-2"
                >
                  <span className="display-quiet text-[1.0625rem] text-ink transition-colors group-hover:text-primary">
                    {detail?.name}
                  </span>
                  <span className="data text-ink-faint">{detail?.yield}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
