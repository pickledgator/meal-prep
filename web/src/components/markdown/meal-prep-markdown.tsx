"use client";

import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { PrepCheckbox } from "@/components/prep/prep-checkbox";

// Context to track if we're inside an ordered list (instructions)
const OrderedListContext = React.createContext(false);

interface MealPrepMarkdownProps {
  content: string;
  className?: string;
  slug?: string; // Plan slug for linking to components/recipes
}

export function MealPrepMarkdown({ content, className, slug }: MealPrepMarkdownProps) {
  return (
    <div className={cn("prose prose-neutral dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight mt-8 mb-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-6 mb-3 border-b pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
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
                <div className="my-3 leading-7 space-y-1 text-sm text-muted-foreground">
                  {lines.filter(line => line.trim()).map((line, i) => (
                    <div key={i}>{processSuperscripts(line.trim())}</div>
                  ))}
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
                <div className="my-3 leading-7">
                  <PrepCheckbox>
                    {icon && <span className="mr-1.5">{icon}</span>}
                    {strippedChildren}
                  </PrepCheckbox>
                </div>
              );
            }

            return (
              <p className="my-3 leading-7">{processSuperscripts(children)}</p>
            );
          },

          // Lists
          ul: ({ children }) => (
            <ul className="my-3 ml-4 space-y-1 list-disc">{children}</ul>
          ),
          ol: ({ children }) => (
            <OrderedListContext.Provider value={true}>
              <ol className="my-3 ml-4 space-y-2 list-decimal">{children}</ol>
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
                <li className="leading-7 list-none">
                  {firstChild}
                  {icon && <span className="mr-1.5">{icon}</span>}
                  {processSuperscripts(childArray.slice(1))}
                </li>
              );
            }

            if (startsWithBallotBox) {
              // Render with interactive checkbox, preserving React elements
              const strippedChildren = stripBallotBox(children);
              return (
                <li className="leading-7 list-none">
                  <PrepCheckbox>
                    {icon && <span className="mr-1.5">{icon}</span>}
                    {strippedChildren}
                  </PrepCheckbox>
                </li>
              );
            }

            return (
              <li className="leading-7">
                {icon && <span className="mr-1.5">{icon}</span>}
                {processSuperscripts(children)}
              </li>
            );
          },

          // Blockquotes (styled as tips)
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-primary/50 bg-primary/5 pl-4 py-2 italic">
              {children}
            </blockquote>
          ),

          // Bold text
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),

          // Italic text
          em: ({ children }) => (
            <em className="italic text-muted-foreground">{children}</em>
          ),

          // Strikethrough (muted for time-saver subtractions)
          del: ({ children }) => (
            <del className="text-muted-foreground/60 line-through">
              {children}
            </del>
          ),

          // Horizontal rules
          hr: () => <hr className="my-6 border-border" />,

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
                    className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
                  >
                    {displayName}
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
                    className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
                  >
                    {displayName}
                  </Link>
                );
              }
            }

            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
                {children}
              </code>
            );
          },

          // Tables
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2">{processSuperscripts(children)}</td>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80"
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
                  className="mr-2 h-4 w-4 rounded border-border accent-primary"
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
  [/\b(beef|steaks?|brisket)\b/i, "🥩"],
  [/\b(lamb)\b/i, "🐑"],
  [/\b(pork|bacon|ham)\b/i, "🥓"],
  [/\beggs?\b/i, "🥚"],
  [/\b(tofu|tempeh)\b/i, "🧈"],
  [/\bsausages?\b/i, "🌭"],

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
  [/\b(cheese|parmesan|feta|cheddar|mozzarella|gouda)\b/i, "🧀"],
  [/\b(butter)\b/i, "🧈"],
  [/\b(yogurt)\b/i, "🥛"],
  [/\b(cream)\b/i, "🥛"],

  // Grains & Bread
  [/\b(rice|farro|quinoa|grain|orzo|couscous)\b/i, "🍚"],
  [/\b(pasta|spaghetti|penne|tagliatelle|noodle|gnocchi)\b/i, "🍝"],
  [/\b(bread|baguette|ciabatta|focaccia|flatbread|pita)\b/i, "🍞"],
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
  [/\b(sauce|soy sauce|fish sauce)\b/i, "🥫"],
  [/\b(stock|broth|bouillon)\b/i, "🥣"],
  [/\b(tahini)\b/i, "🥜"],
  [/\b(nut|almond|walnut|pecan|peanut|cashew)\b/i, "🥜"],
  [/\b(harissa|gochujang|sriracha|hot sauce)\b/i, "🌶️"],
  [/\b(mustard)\b/i, "🟡"],
  [/\b(mayo|mayonnaise)\b/i, "🥚"],
  [/\b(ketchup)\b/i, "🍅"],
  [/\b(can|canned|crushed tomato)\b/i, "🥫"],
  [/\b(panko|breadcrumb)\b/i, "🍞"],
];

// Find an icon for an ingredient
function getIngredientIcon(text: string): string | null {
  for (const [pattern, icon] of ingredientIcons) {
    if (pattern.test(text)) {
      return icon;
    }
  }
  return null;
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

// Process superscript meal references (e.g., ¹²³⁴⁵)
function processSuperscripts(children: React.ReactNode): React.ReactNode {
  if (typeof children !== "string") {
    return children;
  }

  // Match Unicode superscript numbers
  const superscriptRegex = /([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g;

  const parts = children.split(superscriptRegex);

  if (parts.length === 1) {
    return children;
  }

  return parts.map((part, index) => {
    if (superscriptRegex.test(part)) {
      return (
        <sup
          key={index}
          className="text-primary font-medium text-[0.7em] ml-0.5"
        >
          {part}
        </sup>
      );
    }
    return part;
  });
}
