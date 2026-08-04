import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { FolioHeader } from "@/components/plans/folio-header";
import { PrintButton } from "@/components/plans/print-button";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getComponentFile } from "@/lib/plans";
import { extractFolio } from "@/lib/markdown";

interface ComponentPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({
  params,
}: ComponentPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const plan = await getPlan(slug);
  const component = plan?.components.find(
    (c) => c.id === id || c.id === id.replace(".md", "")
  );
  return { title: component?.name ?? "Component" };
}

export default async function ComponentPage({ params }: ComponentPageProps) {
  const { slug, id } = await params;
  const plan = await getPlan(slug);
  const componentContent = await getComponentFile(slug, id);

  if (!plan || !componentContent) {
    notFound();
  }

  // Find the component details from plan.json
  const component = plan.components.find(
    (c) => c.id === id || c.id === id.replace(".md", "")
  );

  const folio = extractFolio(componentContent);

  const usedIn = (component?.used_in ?? [])
    .map((mealId) => plan.meals.find((meal) => meal.id === mealId))
    .filter((meal): meal is NonNullable<typeof meal> => Boolean(meal));

  return (
    <div>
      <FolioHeader
        back={{ href: `/plans/${slug}/prep`, label: "Back to Sunday prep" }}
        kicker={component ? `${component.type} · made ahead` : "Made ahead"}
        title={folio.title ?? component?.name ?? "Component"}
        standfirst={folio.notes[0]}
        actions={<PrintButton label="Print card" />}
        meta={[
          ...(component ? [<>Yields {component.yield}</>] : []),
          ...(folio.notes[1] ? [<>{folio.notes[1]}</>] : []),
        ]}
      />

      {usedIn.length > 0 && (
        <div className="slab-sunk mb-10 px-5 py-4">
          <p className="label mb-3 text-ink">Spent on</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {usedIn.map((meal) => (
              <li key={meal.id}>
                <Link
                  href={`/plans/${slug}/recipes/${meal.id}`}
                  className="group flex items-baseline gap-2"
                >
                  <span className="label bg-ink px-1.5 py-1 text-paper">
                    {meal.id}
                  </span>
                  <span className="display-quiet text-[1.0625rem] text-ink transition-colors group-hover:text-primary">
                    {meal.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <MealPrepMarkdown content={folio.body} slug={slug} />
    </div>
  );
}
