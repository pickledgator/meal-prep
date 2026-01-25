import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanSummary } from "@/lib/types";

interface PlanCardProps {
  plan: PlanSummary;
}

export function PlanCard({ plan }: PlanCardProps) {
  // Format the week date nicely
  const weekDate = new Date(plan.week_of + "T00:00:00");
  const formattedDate = weekDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Get difficulty color
  const difficultyColor = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    challenging:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  }[plan.difficulty] || "bg-gray-100 text-gray-800";

  return (
    <Link href={`/plans/${plan.folder_name}`}>
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg leading-tight">{plan.theme}</CardTitle>
            <Badge variant="outline" className={difficultyColor}>
              {plan.difficulty}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Week of {formattedDate}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>🍽️</span>
              <span>
                {plan.meal_count} meal{plan.meal_count !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>👥</span>
              <span>
                {plan.servings} serving{plan.servings !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
