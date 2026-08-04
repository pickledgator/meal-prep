import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PlanNav } from "@/components/plans/plan-nav";
import { FolioHeader } from "@/components/plans/folio-header";
import { PrintButton } from "@/components/plans/print-button";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getMarkdownFile } from "@/lib/plans";
import { extractFolio } from "@/lib/markdown";
import { formatWeek } from "@/lib/format";

interface PrepPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PrepPageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlan(slug);
  return { title: plan ? `Sunday prep — ${plan.theme}` : "Sunday prep" };
}

export default async function PrepPage({ params }: PrepPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  const prepContent = await getMarkdownFile(slug, "prep-list");

  if (!plan || !prepContent) {
    notFound();
  }

  const folio = extractFolio(prepContent);

  return (
    <div>
      <FolioHeader
        kicker={plan.theme}
        title={folio.title ?? "Sunday prep list"}
        standfirst={folio.notes[0]}
        actions={<PrintButton label="Print prep" />}
        meta={[
          <>Week of {formatWeek(plan.week_of)}</>,
          <>{plan.components.length} components</>,
          <>{plan.difficulty} prep</>,
        ]}
      />

      <PlanNav slug={slug} />

      <p className="label mb-8 text-ink-faint" data-print="hide">
        Tap a task to cross it off — checks clear on reload
      </p>

      <MealPrepMarkdown content={folio.body} slug={slug} />
    </div>
  );
}
