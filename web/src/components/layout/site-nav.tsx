"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { label: "Archive", href: "/" },
  { label: "New plan", href: "/create" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="ml-auto flex items-stretch gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/" || pathname.startsWith("/plans")
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "label relative flex items-center px-3 py-2.5 transition-colors",
              isActive
                ? "text-paper"
                : "text-paper/55 hover:text-paper/90"
            )}
          >
            {link.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3 bottom-1 h-[2.5px] origin-left transition-transform duration-200",
                isActive
                  ? "scale-x-100 bg-olive-bright"
                  : "scale-x-0 bg-olive-bright/70"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
