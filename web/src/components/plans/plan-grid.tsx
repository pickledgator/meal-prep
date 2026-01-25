import { PlanCard } from "./plan-card";
import type { PlanSummary } from "@/lib/types";

interface PlanGridProps {
  plans: PlanSummary[];
}

export function PlanGrid({ plans }: PlanGridProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No meal plans yet.</p>
        <p className="text-muted-foreground text-sm mt-2">
          Create your first plan to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.folder_name} plan={plan} />
      ))}
    </div>
  );
}
