"use client";

import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { PrepCheckbox } from "@/components/prep/prep-checkbox";

// Context to track if we're inside an ordered list (instructions)
const OrderedListContext = React.createContext(false);
// Nesting depth for unordered lists — prep allocations hang off their ingredient
const ListDepthContext = React.createContext(0);

interface MealPrepMarkdownProps {
  content: string;
  className?: string;
  slug?: string; // Plan slug for linking to components/recipes
}

export function MealPrepMarkdown({ content, className, slug }: MealPrepMarkdownProps) {
  return (
    <div className={cn("editorial", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers — the serif carries dish and document titles, the mono
          // label carries structure (Produce, Instructions, Storage Notes)
          h1: ({ children }) => (
            <h1 className="display-heavy mt-12 mb-5 text-[clamp(2rem,4.8vw,3rem)] text-ink first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-12 mb-4 first:mt-0">
              <span className="label section-tab">{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="display mt-9 mb-3 text-[1.375rem] text-ink">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-6 mb-2 font-semibold text-ink">{children}</h4>
          ),

          // Paragraphs with superscript support
          p: ({ children }) => {
            const textContent = extractTextContent(children);

            // Check if this is a KEY section (contains "¹ =" or "² =" etc.)
            const isKeySection = /[¹²³⁴⁵⁶⁷⁸⁹⁰]\s*=/.test(textContent);

            if (isKeySection) {
              // Split by key pattern and render each on its own line
              const lines = textContent.split(/\n|(?=[¹²³⁴⁵⁶⁷⁸⁹⁰]\s*=)/);
              return (
                <div className="slab-sunk my-6 px-5 py-4">
                  <p className="label mb-3 text-ink">Key</p>
                  <div className="data space-y-1.5 text-ink-muted">
                    {lines
                      .filter((line) => line.trim())
                      .map((line, i) => (
                        <div key={i}>{inline(line.trim())}</div>
                      ))}
                  </div>
                </div>
              );
            }

            // Check if paragraph starts with ☐ (ballot box) - make it a checkbox
            const startsWithBallotBox = textContent.trimStart().startsWith("☐");
            if (startsWithBallotBox) {
              const icon = getIngredientIcon(textContent);
              // Strip ☐ from children while preserving React elements
              const strippedChildren = stripBallotBox(children);
              return (
                <div className="my-1">
                  <PrepCheckbox>
                    {icon && <span className="ing-mark">{icon}</span>}
                    {strippedChildren}
                  </PrepCheckbox>
                </div>
              );
            }

            return (
              <p className="measure my-4 leading-[1.72] text-ink">
                {inline(children)}
              </p>
            );
          },

          // Lists
          ul: function UnorderedList({ children }) {
            const depth = React.useContext(ListDepthContext);

            return (
              <ListDepthContext.Provider value={depth + 1}>
                <ul
                  className={cn(
                    "editorial",
                    depth === 0
                      ? "bullets measure my-4 space-y-1.5"
                      : // Allocation children: indented, ruled, quieter
                        "my-2 ml-[0.1rem] space-y-1.5 border-l-2 border-rule pl-4 text-[0.9375rem] text-ink-muted"
                  )}
                  data-depth={depth}
                >
                  {children}
                </ul>
              </ListDepthContext.Provider>
            );
          },
          ol: ({ children }) => (
            <OrderedListContext.Provider value={true}>
              <ol className="steps measure my-5 space-y-4">{children}</ol>
            </OrderedListContext.Provider>
          ),
          li: function ListItem({ children }) {
            const isOrderedList = React.useContext(OrderedListContext);

            // Extract text content to find ingredient icon
            const textContent = extractTextContent(children);
            // Only show icons in unordered lists (grocery, prep), not instructions
            const icon = isOrderedList ? null : getIngredientIcon(textContent);

            // Check if this is a task list item (starts with checkbox input)
            const childArray = React.Children.toArray(children);
            const firstChild = childArray[0];
            const hasInputCheckbox =
              React.isValidElement(firstChild) &&
              (firstChild.type === "input" ||
                (firstChild.props as { type?: string })?.type === "checkbox");

            // Check if text starts with ☐ character (ballot box)
            const startsWithBallotBox = textContent.trimStart().startsWith("☐");

            if (hasInputCheckbox) {
              // Render checkbox input first, then icon, then rest of content
              return (
                <li className="has-mark list-none leading-[1.7]">
                  {firstChild}
                  {icon && <span className="ing-mark">{icon}</span>}
                  {inline(childArray.slice(1), { quantities: true })}
                </li>
              );
            }

            if (startsWithBallotBox) {
              // Render with interactive checkbox, preserving React elements
              const strippedChildren = stripBallotBox(children);
              return (
                <li className="has-mark list-none">
                  <PrepCheckbox>
                    {icon && <span className="ing-mark">{icon}</span>}
                    {strippedChildren}
                  </PrepCheckbox>
                </li>
              );
            }

            return (
              <li className={cn("leading-[1.7]", icon && "has-mark")}>
                {icon && <span className="ing-mark">{icon}</span>}
                {inline(children, { quantities: !isOrderedList })}
              </li>
            );
          },

          // Blockquotes — hot tips and make-ahead notes
          blockquote: ({ children }) => (
            <blockquote className="measure my-7 border-l-[5px] border-primary bg-accent/28 px-6 py-5 text-ink [&>p]:my-0 [&>p]:max-w-none [&>p+p]:mt-3">
              {children}
            </blockquote>
          ),

          // Bold text
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),

          // Italic text — the serif italic, used for yields and subtitles
          em: ({ children }) => (
            <em className="display-quiet italic text-ink-muted">{children}</em>
          ),

          // Strikethrough (muted for time-saver subtractions)
          del: ({ children }) => (
            <del className="text-ink-faint line-through decoration-ink-faint/60">
              {children}
            </del>
          ),

          // Horizontal rules — a ruled break with a centered diamond
          hr: () => (
            <div className="ornament my-10" aria-hidden>
              <span />
            </div>
          ),

          // Code blocks (file references)
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            const text = String(children).replace(/\n$/, "");

            // Check if this is a file reference we can link to
            if (isInline && slug) {
              // Match components/*.md or recipes/*.md
              const componentMatch = text.match(/^components\/(.+?)(?:\.md)?$/);
              const recipeMatch = text.match(/^recipes\/(.+?)(?:\.md)?$/);

              if (componentMatch) {
                const componentId = componentMatch[1];
                const displayName = kebabToTitleCase(componentId);
                return (
                  <Link
                    href={`/plans/${slug}/components/${componentId}`}
                    className="group inline-flex items-baseline gap-1 font-medium text-primary underline decoration-primary/35 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary"
                  >
                    {displayName}
                    <span
                      aria-hidden
                      className="text-[0.75em] transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      &rarr;
                    </span>
                  </Link>
                );
              }

              if (recipeMatch) {
                const recipeId = recipeMatch[1];
                // Strip meal prefix (e.g., "m1-" from "m1-gochujang-salmon")
                const nameWithoutPrefix = recipeId.replace(/^m\d+-/, "");
                const displayName = kebabToTitleCase(nameWithoutPrefix);
                return (
                  <Link
                    href={`/plans/${slug}/recipes/${recipeId}`}
                    className="group inline-flex items-baseline gap-1 font-medium text-primary underline decoration-primary/35 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary"
                  >
                    {displayName}
                    <span
                      aria-hidden
                      className="text-[0.75em] transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      &rarr;
                    </span>
                  </Link>
                );
              }
            }

            if (isInline) {
              return (
                <code className="data rounded-sm bg-secondary px-1.5 py-0.5 text-ink-muted">
                  {children}
                </code>
              );
            }
            return (
              <code className="data my-5 block overflow-x-auto rounded-lg border border-rule bg-secondary p-4 text-ink-muted">
                {children}
              </code>
            );
          },

          // Tables — hairline rows, no outer box, tabular figures
          table: ({ children }) => (
            <div className="my-6 -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
              <table className="w-full border-collapse text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b-2 border-ink/25 bg-paper-sunk/70">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-rule last:border-b-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="label px-3 py-3.5 align-bottom text-ink first:pl-4 last:pr-4">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="tnum px-3 py-3.5 align-top text-[0.9375rem] leading-relaxed text-ink-muted first:pl-4 first:font-medium first:text-ink last:pr-4">
              {inline(children)}
            </td>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              className="font-medium text-primary underline decoration-primary/35 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),

          // Checkboxes in task lists
          input: ({ type, checked }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2.5 size-[1.125rem] rounded-sm border-input accent-primary"
                />
              );
            }
            return <input type={type} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Convert kebab-case to Title Case (e.g., "gochujang-glaze" → "Gochujang Glaze")
function kebabToTitleCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Ingredient to emoji icon mapping (patterns support plurals with s?)
const ingredientIcons: [RegExp, string][] = [
  // Proteins
  [/\b(salmon|fish|cod|halibut|tilapia|trout|tuna|mahi)s?\b/i, "🐟"],
  [/\b(shrimp|prawns?|scallops?|lobsters?|crabs?|shellfish)\b/i, "🦐"],
  [/\b(chicken|poultry)\b/i, "🍗"],
  [/\b(turkey)\b/i, "🦃"],
  [/\b(beef|steaks?|brisket|sirloin)\b/i, "🥩"],
  [/\b(lamb)\b/i, "🐑"],
  [/\b(pork|bacon|ham)\b/i, "🥓"],
  [/\beggs?\b/i, "🥚"],
  [/\b(tofu|tempeh)\b/i, "🧈"],
  [/\bsausages?\b/i, "🌭"],

  // Seasonings that would otherwise be caught by produce patterns below
  [/\b(black pepper|peppercorns?|freshly ground pepper)\b/i, "🧂"],
  [/\b(avocado oil|olive oil)\b/i, "🫗"],

  // Vegetables
  [/\bgarlic\b/i, "🧄"],
  [/\b(onions?|shallots?|scallions?|leeks?)\b/i, "🧅"],
  [/\b(tomato|tomatoes)\b/i, "🍅"],
  [/\b(potatoes?|russets?)\b/i, "🥔"],
  [/\bcarrots?\b/i, "🥕"],
  [/\b(broccoli|broccolini)\b/i, "🥦"],
  [/\b(lettuce|arugula|spinach|greens)\b/i, "🥬"],
  [/\b(kale|chard)\b/i, "🥬"],
  [/\bcorn\b/i, "🌽"],
  [/\b(peppers?|bell peppers?|jalapeños?)\b/i, "🫑"],
  [/\b(hot peppers?|chili|chile|chilies)\b/i, "🌶️"],
  [/\bcucumbers?\b/i, "🥒"],
  [/\b(zucchini|squash)\b/i, "🥒"],
  [/\b(eggplants?|aubergines?)\b/i, "🍆"],
  [/\bmushrooms?\b/i, "🍄"],
  [/\bavocados?\b/i, "🥑"],
  [/\b(cabbage|brussels sprouts?|slaw)\b/i, "🥬"],
  [/\bcelery\b/i, "🥬"],
  [/\basparagus\b/i, "🥬"],
  [/\b(peas?|snap peas?|snow peas?)\b/i, "🫛"],
  [/\b(beans?|green beans?)\b/i, "🫘"],
  [/\bfennel\b/i, "🌿"],
  [/\bradish(es)?\b/i, "🌶️"],
  [/\bartichokes?\b/i, "🥬"],
  [/\bcauliflower\b/i, "🥦"],

  // Fruits
  [/\blemons?\b/i, "🍋"],
  [/\blimes?\b/i, "🍋‍🟩"],
  [/\b(oranges?|citrus|blood oranges?)\b/i, "🍊"],
  [/\bapples?\b/i, "🍎"],
  [/\bbananas?\b/i, "🍌"],
  [/\bgrapes?\b/i, "🍇"],
  [/\bstrawberr(y|ies)\b/i, "🍓"],
  [/\b(blueberr(y|ies)|berr(y|ies))\b/i, "🫐"],
  [/\b(peach(es)?|nectarines?)\b/i, "🍑"],
  [/\bpears?\b/i, "🍐"],
  [/\bmango(es|s)?\b/i, "🥭"],
  [/\bpineapples?\b/i, "🍍"],
  [/\b(watermelons?|melons?)\b/i, "🍉"],
  [/\bcoconuts?\b/i, "🥥"],
  [/\bolives?\b/i, "🫒"],

  // Dairy
  [/\b(milk)\b/i, "🥛"],
  [/\b(cheese|parmesan|parmigiano|feta|cheddar|mozzarella|gouda|halloumi)\b/i, "🧀"],
  [/\b(butter)\b/i, "🧈"],
  [/\b(yogurt)\b/i, "🥛"],
  [/\b(cream)\b/i, "🥛"],

  // Grains & Bread
  [/\b(rice|farro|quinoa|grain|orzo|couscous|polenta|bulgur)\b/i, "🍚"],
  [/\b(pasta|spaghetti|penne|tagliatelle|noodle|gnocchi|orecchiette)\b/i, "🍝"],
  [/\b(bread|baguette|ciabatta|focaccia|flatbread|pita|sourdough)\b/i, "🍞"],
  [/\b(flour|wheat)\b/i, "🌾"],
  [/\b(oat)\b/i, "🌾"],

  // Herbs & Spices
  [/\b(herb|parsley|cilantro|basil|dill|mint|thyme|rosemary|oregano|sage|chive)\b/i, "🌿"],
  [/\b(ginger)\b/i, "🫚"],
  [/\b(spice|cumin|paprika|cinnamon|turmeric|coriander)\b/i, "🧂"],
  [/\b(salt|pepper|seasoning)\b/i, "🧂"],

  // Pantry
  [/\bolive oil\b/i, "🫒"],
  [/\b(sesame oil|neutral oil|vegetable oil|canola oil|avocado oil|oil)\b/i, "🫗"],
  [/\b(vinegar)\b/i, "🍶"],
  [/\b(honey)\b/i, "🍯"],
  [/\b(sugar)\b/i, "🍬"],
  [/\b(sauce|soy sauce|fish sauce|pesto)\b/i, "🥫"],
  [/\b(stock|broth|bouillon)\b/i, "🥣"],
  [/\b(tahini)\b/i, "🥜"],
  [/\b(nut|almond|walnut|pecan|peanut|cashew|pine nuts?)\b/i, "🥜"],
  [/\b(harissa|gochujang|sriracha|hot sauce)\b/i, "🌶️"],
  [/\b(mustard)\b/i, "🟡"],
  [/\b(mayo|mayonnaise)\b/i, "🥚"],
  [/\b(ketchup)\b/i, "🍅"],
  [/\b(can|canned|crushed tomato)\b/i, "🥫"],
  [/\b(panko|breadcrumb)\b/i, "🍞"],
];

// Limit icon inference to the item header. Prep allocation children and nested
// destinations may mention unrelated foods (for example, a garlic allocation
// destined for "Chicken Marinade"); those words must not override the actual
// ingredient at the start of the line.
function getIconSubject(text: string): string {
  const normalized = text.replace(/^\s*☐\s*/, "").trim();
  const boundaries = ["—", "(", ";", "→", "\n"]
    .map((marker) => normalized.indexOf(marker))
    .filter((index) => index >= 0);

  if (boundaries.length === 0) return normalized;
  return normalized.slice(0, Math.min(...boundaries)).trim();
}

function matchIcon(subject: string): string | null {
  for (const [pattern, icon] of ingredientIcons) {
    if (pattern.test(subject)) {
      return icon;
    }
  }
  return null;
}

// Find an icon for the ingredient named in the item's own header. When the
// header alone yields nothing — recipe lines lead with a quantity, as in
// "1 lb (454 g) Brussels Sprouts" — widen to everything before the first
// arrow, which is the only part that can name another component.
function getIngredientIcon(text: string): string | null {
  const subject = getIconSubject(text);
  if (subject) {
    const fromSubject = matchIcon(subject);
    if (fromSubject) return fromSubject;
  }

  const beforeDestination = text.replace(/^\s*☐\s*/, "").split("→")[0].trim();
  if (!beforeDestination || beforeDestination === subject) return null;

  return matchIcon(beforeDestination);
}

// Extract plain text content from React children
function extractTextContent(children: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join("");
  }
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return extractTextContent(props.children);
  }
  return "";
}

// Strip ☐ from the beginning of children while preserving React elements
function stripBallotBox(children: React.ReactNode): React.ReactNode {
  const childArray = React.Children.toArray(children);
  if (childArray.length === 0) return children;

  const first = childArray[0];

  // If first child is a string, strip the ☐ from it
  if (typeof first === "string") {
    const stripped = first.replace(/^\s*☐\s*/, "");
    if (stripped) {
      return [stripped, ...childArray.slice(1)];
    }
    return childArray.slice(1);
  }

  // If first child is an element, check if it contains the ☐
  if (React.isValidElement(first)) {
    const props = first.props as { children?: React.ReactNode };
    const innerText = extractTextContent(props.children);
    if (innerText.trimStart().startsWith("☐")) {
      // Recursively strip from the element's children
      const newProps = { ...props, children: stripBallotBox(props.children) };
      const newFirst = React.cloneElement(first, newProps);
      return [newFirst, ...childArray.slice(1)];
    }
  }

  return children;
}

/**
 * Typographic pass over text nodes: meal-reference superscripts, the prep
 * list's `quantity → prep → destination` arrows, and the 🫙 marker that means
 * an allocation is spent by a Sunday component.
 *
 * Applied per string node so bold, links, and other elements pass untouched.
 */
interface InlineOptions {
  /** Set parenthesised measurements in the mono face (ingredient lists). */
  quantities?: boolean;
}

export function inline(
  children: React.ReactNode,
  options: InlineOptions = {}
): React.ReactNode {
  if (typeof children === "string") {
    return decorateText(children, options);
  }
  if (Array.isArray(children)) {
    return children.map((child, index) =>
      typeof child === "string" ? (
        <React.Fragment key={index}>
          {decorateText(child, options)}
        </React.Fragment>
      ) : (
        child
      )
    );
  }
  return children;
}

const TOKEN = /([¹²³⁴⁵⁶⁷⁸⁹⁰]+)|(→)|(🫙)/g;
// Parenthesised runs containing a digit — "(2 heads / 567 g)" but not "(optional)"
const TOKEN_WITH_QTY = /([¹²³⁴⁵⁶⁷⁸⁹⁰]+)|(→)|(🫙)|(\([^()]*\d[^()]*\))/g;

function decorateText(text: string, options: InlineOptions): React.ReactNode {
  const pattern = options.quantities ? TOKEN_WITH_QTY : TOKEN;
  if (!pattern.test(text)) return text;
  pattern.lastIndex = 0;

  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    if (/^[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/.test(part)) {
      return (
        <sup
          key={index}
          className="ml-0.5 font-mono text-[0.72em] font-semibold tabular-nums text-primary"
        >
          {part}
        </sup>
      );
    }

    if (options.quantities && /^\([^()]*\d[^()]*\)$/.test(part)) {
      return (
        <span key={index} className="qty">
          {part}
        </span>
      );
    }

    if (part === "→") {
      return (
        <span key={index} aria-hidden className="mx-1 text-primary/70">
          &rarr;
        </span>
      );
    }

    if (part === "🫙") {
      return (
        <span
          key={index}
          title="Spent by a component you make on Sunday"
          className="ml-1 cursor-help align-baseline text-[0.85em]"
        >
          🫙
        </span>
      );
    }

    return part;
  });
}

// Backwards-compatible alias for the previous helper name.
export const processSuperscripts = inline;
