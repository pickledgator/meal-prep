import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PlanNav } from "@/components/plans/plan-nav";
import { MealCard } from "@/components/plans/meal-card";
import { getPlan } from "@/lib/plans";

interface PlanPageProps {
  params: Promise<{ slug: string }>;
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
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{plan.theme}</h1>
          <Badge variant="outline">{plan.difficulty}</Badge>
        </div>
        <p className="text-muted-foreground">
          Week of {formattedDate} &middot; {plan.servings} servings
          {plan.leftovers && " &middot; With leftovers"}
        </p>
      </div>

      <PlanNav slug={slug} />

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">This Week&apos;s Meals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {plan.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} slug={slug} />
            ))}
          </div>
        </div>

        {plan.components.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Components</h2>
            <div className="flex flex-wrap gap-2">
              {plan.components.map((component) => (
                <Badge key={component.id} variant="secondary">
                  {component.name}
                  <span className="ml-1 text-muted-foreground">
                    ({component.yield})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
