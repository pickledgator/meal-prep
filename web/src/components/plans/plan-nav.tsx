"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PlanNavProps {
  slug: string;
}

const navItems = [
  { label: "Overview", href: "" },
  { label: "Menu", href: "/menu" },
  { label: "Grocery", href: "/grocery" },
  { label: "Prep", href: "/prep" },
  { label: "Essentials", href: "/essentials" },
];

export function PlanNav({ slug }: PlanNavProps) {
  const pathname = usePathname();
  const basePath = `/plans/${slug}`;

  return (
    <nav className="flex items-center space-x-1 border-b mb-6">
      {navItems.map((item) => {
        const href = `${basePath}${item.href}`;
        const isActive =
          item.href === ""
            ? pathname === basePath
            : pathname.startsWith(href);

        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
