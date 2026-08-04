import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PlanNav } from "@/components/plans/plan-nav";
import { FolioHeader } from "@/components/plans/folio-header";
import { PrintButton } from "@/components/plans/print-button";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getMarkdownFile } from "@/lib/plans";
import { extractFolio } from "@/lib/markdown";
import { formatWeek } from "@/lib/format";

interface GroceryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: GroceryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlan(slug);
  return { title: plan ? `Grocery list — ${plan.theme}` : "Grocery list" };
}

export default async function GroceryPage({ params }: GroceryPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  const groceryContent = await getMarkdownFile(slug, "grocery-list");

  if (!plan || !groceryContent) {
    notFound();
  }

  const folio = extractFolio(groceryContent);

  return (
    <div>
      <FolioHeader
        kicker={plan.theme}
        title={folio.title ?? "Grocery list"}
        actions={<PrintButton label="Print list" />}
        meta={[
          <>Week of {formatWeek(plan.week_of)}</>,
          <>{plan.servings} servings</>,
          <>{plan.meals.length} dinners</>,
        ]}
      />

      <PlanNav slug={slug} />

      <MealPrepMarkdown content={folio.body} slug={slug} />
    </div>
  );
}
