import type { ReactNode } from "react";
import { Link } from "wouter";

interface FolioHeaderProps {
  /** Small mono line above the title */
  kicker?: ReactNode;
  title: string;
  /** Italic serif line under the title — a dish's "with ..." subtitle */
  standfirst?: ReactNode;
  /** Dot-separated mono metadata */
  meta?: ReactNode[];
  back?: { href: string; label: string };
  actions?: ReactNode;
  size?: "page" | "section";
}

export function FolioHeader({ kicker, title, standfirst, meta, back, actions, size = "page" }: FolioHeaderProps) {
  return (
    <header className="mb-10">
      {back && (
        <Link
          href={back.href}
          data-print="hide"
          className="label group mb-6 inline-flex items-center gap-2 text-ink-faint transition-colors hover:text-ink"
        >
          <span aria-hidden className="inline-block transition-transform duration-200 group-hover:-translate-x-0.5">
            &larr;
          </span>
          {back.label}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-[22rem]">
          {kicker && <p className="label text-primary">{kicker}</p>}
          <h1
            className={
              size === "page"
                ? "display-heavy mt-3.5 text-[clamp(2.25rem,5.5vw,3.5rem)] text-ink"
                : "display-heavy mt-3.5 text-[clamp(1.875rem,4.5vw,2.75rem)] text-ink"
            }
          >
            {title}
          </h1>
          {standfirst && <p className="display-quiet mt-3.5 text-xl italic text-ink-muted">{standfirst}</p>}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {meta && meta.length > 0 && (
        <p className="data mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
          {meta.map((item, index) => (
            <span key={index} className="flex items-center gap-3">
              {index > 0 && <span className="text-rule-strong">·</span>}
              {item}
            </span>
          ))}
        </p>
      )}
    </header>
  );
}
