import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealPrepMarkdown } from "@/components/markdown/meal-prep-markdown";
import { getPlan, getRecipeFile } from "@/lib/plans";

interface RecipePageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug, id } = await params;
  const plan = await getPlan(slug);
  const recipeContent = await getRecipeFile(slug, id);

  if (!plan || !recipeContent) {
    notFound();
  }

  // Find the meal details
  const meal = plan.meals.find((m) => m.id === id);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/plans/${slug}`}>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <span className="mr-2">&larr;</span>
            Back to {plan.theme}
          </Button>
        </Link>

        {meal && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {meal.protein_category}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {meal.cuisine}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {meal.prep_time_minutes + meal.cook_time_minutes} min total
            </Badge>
          </div>
        )}
      </div>

      <MealPrepMarkdown content={recipeContent} slug={slug} />

      {meal && meal.components.length > 0 && (
        <div className="mt-8 p-4 rounded-lg bg-muted/50">
          <h3 className="font-semibold mb-2">Components Used</h3>
          <div className="flex flex-wrap gap-2">
            {meal.components.map((componentId) => {
              const component = plan.components.find((c) => c.id === componentId);
              return (
                <Link key={componentId} href={`/plans/${slug}/components/${componentId}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                    {component?.name || componentId}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
