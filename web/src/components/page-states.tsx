import { ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFound } from "@/pages/not-found";

export function PagePlaceholder() {
  return (
    <div>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-5 h-14 w-2/3 max-w-xl" />
      <Skeleton className="mt-5 h-4 w-64" />
      <div className="mt-12 space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export function QueryError({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 404) {
    return <NotFound />;
  }
  const message = error instanceof Error ? error.message : "something went wrong";
  return (
    <div className="slab px-6 py-10 sm:px-10">
      <p className="label text-destructive">Request failed</p>
      <h1 className="display mt-3 text-2xl text-ink">The kitchen isn&rsquo;t answering.</h1>
      <p className="data mt-4 text-ink-muted">{message}</p>
    </div>
  );
}
