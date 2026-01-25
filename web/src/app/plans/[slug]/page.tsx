import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlanNav } from "@/components/plans/plan-nav";
import { getPlan } from "@/lib/plans";

interface PlanPageProps {
  params: Promise<{ slug: string }>;
}

// Get protein category styling
function getCategoryStyle(category: string) {
  const styles: Record<string, { bg: string; border: string; accent: string }> = {
    seafood: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      accent: "text-blue-600 dark:text-blue-400",
    },
    poultry: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      accent: "text-amber-600 dark:text-amber-400",
    },
    "red meat": {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      accent: "text-red-600 dark:text-red-400",
    },
    vegetarian: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      accent: "text-green-600 dark:text-green-400",
    },
  };
  return styles[category] || {
    bg: "bg-muted/30",
    border: "border-border",
    accent: "text-muted-foreground",
  };
}

export default async function PlanPage({ params }: PlanPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);

  if (!plan) {
    notFound();
  }

  // Format the week date
  const weekDate = new Date(plan.week_of + "T00:00:00");
  const formattedDate = weekDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Week of {formattedDate}</span>
          <span>&middot;</span>
          <span>{plan.servings} servings</span>
          {plan.leftovers && (
            <>
              <span>&middot;</span>
              <span>With leftovers</span>
            </>
          )}
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">{plan.theme}</h1>
        <Badge variant="outline" className="text-sm">
          {plan.difficulty}
        </Badge>
      </div>

      <PlanNav slug={slug} />

      {/* Meal Grid */}
      <div className="grid gap-6">
        {plan.meals.map((meal, index) => {
          const style = getCategoryStyle(meal.protein_category);
          const mealNumber = index + 1;
          const totalTime = meal.prep_time_minutes + meal.cook_time_minutes;

          return (
            <Link key={meal.id} href={`/plans/${slug}/recipes/${meal.id}`}>
              <Card
                className={`overflow-hidden transition-all hover:shadow-lg hover:scale-[1.01] cursor-pointer border-l-4 ${style.border}`}
              >
                <CardContent className={`p-6 ${style.bg}`}>
                  <div className="flex items-start gap-4">
                    {/* Meal Number */}
                    <div
                      className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-background border-2 ${style.border} ${style.accent} text-xl font-bold`}
                    >
                      {mealNumber}
                    </div>

                    {/* Meal Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold mb-1">
                            {meal.name}
                          </h2>
                          {meal.subtitle && (
                            <p className="text-muted-foreground italic mb-3">
                              {meal.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {totalTime} min
                          </Badge>
                          <Badge variant="outline" className={style.accent}>
                            {meal.protein}
                          </Badge>
                        </div>
                      </div>

                      {/* Key Ingredients */}
                      {meal.key_ingredients.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {meal.key_ingredients.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
