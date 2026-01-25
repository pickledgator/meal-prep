import { notFound } from "next/navigation";
import { PlanNav } from "@/components/plans/plan-nav";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getMarkdownFile } from "@/lib/plans";

interface GroceryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GroceryPage({ params }: GroceryPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  const groceryContent = await getMarkdownFile(slug, "grocery-list");

  if (!plan || !groceryContent) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{plan.theme}</h1>
        <p className="text-muted-foreground">Grocery List</p>
      </div>

      <PlanNav slug={slug} />

      <MealPrepMarkdown content={groceryContent} slug={slug} />
    </div>
  );
}
