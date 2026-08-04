import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface PlanNavProps {
  slug: string;
}

const navItems = [
  { label: "Menu", href: "" },
  { label: "Grocery", href: "/grocery" },
  { label: "Prep", href: "/prep" },
  { label: "Essentials", href: "/essentials" },
];

export function PlanNav({ slug }: PlanNavProps) {
  const [pathname] = useLocation();
  const basePath = `/plans/${slug}`;

  return (
    <nav
      aria-label="Plan sections"
      data-print="hide"
      className="sticky top-[4.25rem] z-40 -mx-5 mb-10 border-b border-rule bg-paper/92 px-5 backdrop-blur-md md:-mx-8 md:px-8"
    >
      <ul className="flex items-stretch gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = item.href === "" ? pathname === basePath : pathname.startsWith(href);

          return (
            <li key={item.label}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "label relative flex h-12 items-center whitespace-nowrap px-3 transition-colors",
                  isActive ? "text-ink" : "text-ink-faint hover:text-ink-muted",
                )}
              >
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-[2px] origin-left transition-transform duration-200",
                    isActive ? "scale-x-100 bg-primary" : "scale-x-0 bg-primary/60",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
