import { notFound } from "next/navigation";
import { PlanNav } from "@/components/plans/plan-nav";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getMarkdownFile } from "@/lib/plans";

interface MenuPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  const menuContent = await getMarkdownFile(slug, "menu");

  if (!plan || !menuContent) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{plan.theme}</h1>
        <p className="text-muted-foreground">Menu</p>
      </div>

      <PlanNav slug={slug} />

      <MealPrepMarkdown content={menuContent} slug={slug} />
    </div>
  );
}
