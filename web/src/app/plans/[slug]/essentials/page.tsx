import { notFound } from "next/navigation";
import { PlanNav } from "@/components/plans/plan-nav";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getMarkdownFile } from "@/lib/plans";

interface EssentialsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EssentialsPage({ params }: EssentialsPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  const essentialsContent = await getMarkdownFile(slug, "essentials");

  if (!plan || !essentialsContent) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{plan.theme}</h1>
        <p className="text-muted-foreground">Essentials & Time Savers</p>
      </div>

      <PlanNav slug={slug} />

      <MealPrepMarkdown content={essentialsContent} slug={slug} />
    </div>
  );
}
