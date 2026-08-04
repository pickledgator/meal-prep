import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-10">
      <p className="label text-primary">404</p>
      <h1 className="display-heavy mt-4 text-[clamp(2.25rem,6vw,4rem)] text-ink">
        That page isn&rsquo;t in the archive.
      </h1>

      <div className="mt-8 max-w-xl">
        <p className="text-ink-muted">
          The plan may have been renamed, or the recipe belongs to a different
          week. Both are easy to find from the archive.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="label inline-flex items-center gap-2.5 bg-ink px-5 py-4 text-paper transition-colors duration-200 hover:bg-primary"
          >
            Browse the archive
            <span aria-hidden>&rarr;</span>
          </Link>
          <Link
            href="/create"
            className="label inline-flex items-center gap-2.5 border-2 border-ink px-5 py-4 text-ink transition-colors duration-200 hover:border-primary hover:text-primary"
          >
            Plan a week
          </Link>
        </div>
      </div>
    </div>
  );
}
