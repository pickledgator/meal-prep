import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PlanNav } from "@/components/plans/plan-nav";
import { FolioHeader } from "@/components/plans/folio-header";
import { PrintButton } from "@/components/plans/print-button";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getMarkdownFile } from "@/lib/plans";
import { extractFolio } from "@/lib/markdown";

interface EssentialsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EssentialsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlan(slug);
  return { title: plan ? `Essentials — ${plan.theme}` : "Essentials" };
}

export default async function EssentialsPage({ params }: EssentialsPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  const essentialsContent = await getMarkdownFile(slug, "essentials");

  if (!plan || !essentialsContent) {
    notFound();
  }

  const folio = extractFolio(essentialsContent);

  return (
    <div>
      <FolioHeader
        kicker={plan.theme}
        title={folio.title ?? "Essentials & time savers"}
        standfirst="What to assume you already have — and where a shortcut is fair game."
        actions={<PrintButton label="Print page" />}
      />

      <PlanNav slug={slug} />

      <MealPrepMarkdown content={folio.body} slug={slug} />
    </div>
  );
}
