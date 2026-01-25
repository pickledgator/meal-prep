import { Skeleton } from "@/components/ui/skeleton";

export default function PlanLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Nav skeleton */}
      <div className="flex items-center space-x-1 border-b mb-6 pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
