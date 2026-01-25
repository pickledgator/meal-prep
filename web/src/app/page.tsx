import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlanGrid } from "@/components/plans/plan-grid";
import { getAllPlanSummaries } from "@/lib/plans";

export default async function HomePage() {
  const plans = await getAllPlanSummaries();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meal Plans</h1>
          <p className="text-muted-foreground">
            Browse your weekly meal prep plans
          </p>
        </div>
        <Link href="/create">
          <Button>
            <span className="mr-2">+</span>
            New Plan
          </Button>
        </Link>
      </div>

      <PlanGrid plans={plans} />
    </div>
  );
}
