import React from "react";
import { Link } from "wouter";

/**
 * Renders ONE line of stored text — a step, an ingredient, a task, a note.
 * Replaces the old 617-line document renderer: page structure now comes from
 * structured data, so all that's left is the inline vocabulary the generator
 * writes into text fields:
 *
 *   **bold**  _italic_  ~~strike~~  `code`  (with `components/x` → app link)
 *   meal superscripts ¹²³ · prep arrows → · the 🫙 Sunday-consumed marker
 *   parenthesised quantities set in the mono face (opt-in)
 */

interface InlineMarkdownProps {
  text: string;
  /** Plan slug — enables `components/x` and `recipes/m1-x` code-span links. */
  slug?: string;
  /** Set parenthesised measurements in the mono face (ingredient lists). */
  quantities?: boolean;
}

const MD_TOKEN = /(`[^`]+`|\*\*[^*]+?\*\*|~~[^~]+?~~|_[^_]+?_)/g;

export function InlineMarkdown({ text, slug, quantities = false }: InlineMarkdownProps) {
  const parts = text.split(MD_TOKEN);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return <CodeSpan key={index} text={part.slice(1, -1)} slug={slug} />;
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={index} className="font-semibold text-ink">
              {decorate(part.slice(2, -2), quantities)}
            </strong>
          );
        }
        if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
          return (
            <del key={index} className="text-ink-faint line-through decoration-ink-faint/60">
              {decorate(part.slice(2, -2), quantities)}
            </del>
          );
        }
        if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
          return (
            <em key={index} className="display-quiet italic text-ink-muted">
              {decorate(part.slice(1, -1), quantities)}
            </em>
          );
        }
        return <React.Fragment key={index}>{decorate(part, quantities)}</React.Fragment>;
      })}
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Code spans — `components/x.md` and `recipes/m1-x.md` become app links
 * ------------------------------------------------------------------------- */

function kebabToTitleCase(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const LINK_CLASS =
  "group inline-flex items-baseline gap-1 font-medium text-primary underline decoration-primary/35 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary";

function CodeSpan({ text, slug }: { text: string; slug?: string }) {
  if (slug) {
    const componentMatch = text.match(/^components\/(.+?)(?:\.md)?$/);
    const recipeMatch = text.match(/^recipes\/(.+?)(?:\.md)?$/);

    if (componentMatch) {
      return (
        <Link href={`/plans/${slug}/components/${componentMatch[1]}`} className={LINK_CLASS}>
          {kebabToTitleCase(componentMatch[1])}
          <span aria-hidden className="text-[0.75em] transition-transform duration-200 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>
      );
    }
    if (recipeMatch) {
      const mealId = recipeMatch[1].match(/^m\d+/)?.[0] ?? recipeMatch[1];
      return (
        <Link href={`/plans/${slug}/recipes/${mealId}`} className={LINK_CLASS}>
          {kebabToTitleCase(recipeMatch[1].replace(/^m\d+-/, ""))}
          <span aria-hidden className="text-[0.75em] transition-transform duration-200 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>
      );
    }
  }
  return <code className="data rounded-sm bg-secondary px-1.5 py-0.5 text-ink-muted">{text}</code>;
}

/* ---------------------------------------------------------------------------
 * Typographic pass over plain text — ported from the old renderer
 * ------------------------------------------------------------------------- */

const TOKEN = /([¹²³⁴⁵⁶⁷⁸⁹⁰]+)|(→)|(🫙)/g;
// Parenthesised runs containing a digit — "(2 heads / 567 g)" but not "(optional)"
const TOKEN_WITH_QTY = /([¹²³⁴⁵⁶⁷⁸⁹⁰]+)|(→)|(🫙)|(\([^()]*\d[^()]*\))/g;

function decorate(text: string, quantities: boolean): React.ReactNode {
  const pattern = quantities ? TOKEN_WITH_QTY : TOKEN;
  if (!pattern.test(text)) return text;
  pattern.lastIndex = 0;

  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    if (/^[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/.test(part)) {
      return <MealSup key={index} refs={part} />;
    }

    if (quantities && /^\([^()]*\d[^()]*\)$/.test(part)) {
      return (
        <span key={index} className="qty">
          {part}
        </span>
      );
    }

    if (part === "→") {
      return <Arrow key={index} />;
    }

    if (part === "🫙") {
      return <JarMark key={index} />;
    }

    return part;
  });
}

/* Shared marks — also used directly by structured views (grocery, prep). */

export function MealSup({ refs }: { refs: string }) {
  return <sup className="ml-0.5 font-mono text-[0.72em] font-semibold tabular-nums text-primary">{refs}</sup>;
}

export function Arrow() {
  return (
    <span aria-hidden className="mx-1 text-primary/70">
      &rarr;
    </span>
  );
}

export function JarMark() {
  return (
    <span title="Spent by a component you make on Sunday" className="ml-1 cursor-help align-baseline text-[0.85em]">
      🫙
    </span>
  );
}
