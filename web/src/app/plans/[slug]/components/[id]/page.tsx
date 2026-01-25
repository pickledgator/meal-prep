import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getComponentFile } from "@/lib/plans";

interface ComponentPageProps {
  params: Promise<{ slug: string; id: string }>;
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

  return (
    <div>
      <div className="mb-6">
        <Link href={`/plans/${slug}/prep`}>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <span className="mr-2">&larr;</span>
            Back to Prep List
          </Button>
        </Link>

        {component && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {component.type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {component.yield}
            </Badge>
            {component.used_in.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Used in meals {component.used_in.join(", ")}
              </span>
            )}
          </div>
        )}
      </div>

      <MealPrepMarkdown content={componentContent} slug={slug} />
    </div>
  );
}
