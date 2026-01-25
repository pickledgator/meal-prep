import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Meal } from "@/lib/types";

interface MealCardProps {
  meal: Meal;
  slug: string;
}

export function MealCard({ meal, slug }: MealCardProps) {
  // Get protein category color
  const categoryColor = {
    seafood: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    poultry:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    "red meat": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    vegetarian:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }[meal.protein_category] || "bg-gray-100 text-gray-800";

  // Get meal number from id (e.g., "m1" -> "1")
  const mealNumber = meal.id.replace("m", "");

  return (
    <Link href={`/plans/${slug}/recipes/${meal.id}`}>
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {mealNumber}
              </span>
              <CardTitle className="text-base leading-tight">
                {meal.name}
              </CardTitle>
            </div>
          </div>
          {meal.subtitle && (
            <p className="text-sm text-muted-foreground italic">
              {meal.subtitle}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={categoryColor}>
              {meal.protein}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {meal.prep_time_minutes + meal.cook_time_minutes} min
            </Badge>
          </div>
          {meal.key_ingredients.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
              {meal.key_ingredients.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
