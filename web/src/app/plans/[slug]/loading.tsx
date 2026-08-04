import { Skeleton } from "@/components/ui/skeleton";

export default function PlanLoading() {
  return (
    <div>
      {/* Folio header */}
      <div className="mb-10">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-12 w-full max-w-lg" />
        <div className="mt-5 flex gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="hidden h-4 w-32 sm:block" />
        </div>
      </div>

      {/* Section rail */}
      <div className="mb-10 flex gap-1 border-b border-rule pb-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>

      {/* Menu entries */}
      <Skeleton className="mb-5 h-3.5 w-24" />
      <div className="space-y-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-5">
            <Skeleton className="size-10 rounded-sm" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="hidden h-4 w-16 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
