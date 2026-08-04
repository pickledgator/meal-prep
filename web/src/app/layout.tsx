import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/layout/site-nav";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  // Headlines block briefly rather than flashing in a fallback sans and
  // reflowing — the serif is doing too much of the design's work to swap.
  display: "block",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Meal Prep — the weekly archive",
    template: "%s · Meal Prep",
  },
  description:
    "Weekly dinner plans with Sunday prep lists, grocery lists, and recipe cards. Built for Northern California seasons.",
  openGraph: {
    title: "Meal Prep — the weekly archive",
    description:
      "Weekly dinner plans with Sunday prep lists, grocery lists, and recipe cards.",
    type: "website",
  },
};

function PlateMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-olive-bright"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.25" />
      <path
        d="M5 13.6h14"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8.7" r="2" fill="currentColor" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Font variables must land on the root element: globals.css maps them to
  // --font-display/--font-sans/--font-mono in `:root`, and a custom property
  // declared on <body> would be invisible to that declaration.
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${plexMono.variable}`}
    >
      <body className="antialiased min-h-dvh bg-background flex flex-col">
        <a
          href="#main"
          className="label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:bg-primary focus:px-3 focus:py-2.5 focus:text-primary-foreground"
        >
          Skip to content
        </a>

        {/* Masthead — a solid ink band, the way a menu board is printed */}
        <header
          data-print="hide"
          className="sticky top-0 z-50 w-full bg-ink text-paper shadow-[0_2px_0_0_var(--olive)]"
        >
          <div className="container flex h-[4.25rem] items-center">
            <Link
              href="/"
              className="group flex items-baseline gap-3"
              aria-label="Meal Prep home"
            >
              <span className="translate-y-[3px]">
                <PlateMark />
              </span>
              <span className="display text-[1.6rem] leading-none text-paper">
                Meal&nbsp;Prep
              </span>
              <span className="label hidden text-paper/40 sm:inline">
                est. 2026
              </span>
            </Link>
            <SiteNav />
          </div>
        </header>

        <main id="main" className="container flex-1 py-12 md:py-16">
          {children}
        </main>

        <footer data-print="hide" className="mt-12">
          <div className="container">
            <div className="flex flex-col gap-3 border-t border-rule py-7 sm:flex-row sm:items-center sm:justify-between">
              <p className="label text-ink">
                Meal Prep
                <span className="ml-2.5 font-normal text-ink-faint">
                  Northern California seasons
                </span>
              </p>
              <p className="data text-ink-faint">
                Every page prints clean — ⌘P in the kitchen.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
