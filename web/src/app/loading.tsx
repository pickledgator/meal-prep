import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-16 md:space-y-24">
      {/* Masthead */}
      <section>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-5 h-14 w-full max-w-xl" />
        <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:justify-between">
          <Skeleton className="h-12 w-full max-w-sm" />
          <Skeleton className="h-13 w-40" />
        </div>
      </section>

      {/* Feature */}
      <div className="grid gap-x-14 gap-y-10 md:grid-cols-[1.45fr_1fr]">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-11 w-3/4" />
          <Skeleton className="mt-5 h-3.5 w-64" />
          <div className="mt-8 space-y-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="size-7 rounded-sm" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="slab space-y-4 p-7">
          <Skeleton className="h-3 w-20" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>

      {/* Index */}
      <div>
        <Skeleton className="mb-5 h-3.5 w-32" />
        <div className="space-y-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-baseline gap-5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 max-w-xs flex-1" />
              <Skeleton className="hidden h-4 w-44 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
