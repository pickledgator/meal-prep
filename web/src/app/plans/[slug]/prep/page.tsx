import { notFound } from "next/navigation";
import { PlanNav } from "@/components/plans/plan-nav";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getMarkdownFile } from "@/lib/plans";

interface PrepPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PrepPage({ params }: PrepPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  const prepContent = await getMarkdownFile(slug, "prep-list");

  if (!plan || !prepContent) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{plan.theme}</h1>
        <p className="text-muted-foreground">Sunday Prep List</p>
      </div>

      <PlanNav slug={slug} />

      <MealPrepMarkdown content={prepContent} slug={slug} />
    </div>
  );
}
