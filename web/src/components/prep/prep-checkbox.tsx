"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PrepCheckboxProps {
  children: React.ReactNode;
  className?: string;
}

// Extract text content from React children
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return "";
}

// Split React children at the point where description starts (after superscripts, before capital letter)
function splitChildrenAtDescription(children: React.ReactNode): {
  header: React.ReactNode[];
  description: React.ReactNode[];
} | null {
  const childArray = React.Children.toArray(children);
  const header: React.ReactNode[] = [];
  const description: React.ReactNode[] = [];
  let foundSplit = false;
  let lastWasSuperscript = false;

  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    const text = extractText(child);

    if (foundSplit) {
      description.push(child);
      continue;
    }

    // Check if this child contains superscripts
    const hasSuperscript = /[¹²³⁴⁵⁶⁷⁸⁹⁰]/.test(text);
    const hasJarEmoji = text.includes("🫙");

    if (hasSuperscript || hasJarEmoji) {
      lastWasSuperscript = true;
      header.push(child);
      continue;
    }

    // If previous was superscript and this starts with capital letter, it's the description
    if (lastWasSuperscript && typeof child === "string") {
      const trimmed = child.trimStart();
      if (trimmed && /^[A-Z]/.test(trimmed)) {
        foundSplit = true;
        description.push(child);
        continue;
      }
    }

    header.push(child);
  }

  if (description.length > 0) {
    return { header, description };
  }
  return null;
}

// Add space after leading emoji for better readability
function formatWithEmojiSpacing(text: string): string {
  return text.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)(?=\S)/u, "$1 ");
}

export function PrepCheckbox({ children, className }: PrepCheckboxProps) {
  const [checked, setChecked] = useState(false);
  const text = extractText(children);

  // Pattern 1: Ingredient with prep instruction in parentheses
  // e.g., "🧄 Garlic (10 cloves; peel and mince)🫙"
  const ingredientMatch = text.match(/^(.+?\([^;)]+);\s*(.+?)\)(.*)$/);

  if (ingredientMatch) {
    const [, ingredientPart, prepInstructions, suffix] = ingredientMatch;

    return (
      <div className={cn("flex items-start gap-2", className)}>
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
          className="mt-1.5"
        />
        <div
          className={cn(
            "flex-1 transition-colors",
            checked && "text-muted-foreground"
          )}
        >
          <div className={cn("font-medium", checked && "line-through")}>
            {formatWithEmojiSpacing(ingredientPart.trim())}){suffix}
          </div>
          <div
            className={cn(
              "text-sm text-muted-foreground mt-0.5 pl-2 border-l-2 border-muted ml-1",
              checked && "line-through"
            )}
          >
            {prepInstructions}
          </div>
        </div>
      </div>
    );
  }

  // Pattern 2: Component/task with description after superscripts
  // e.g., "**Gochujang Glaze** — see file.md¹ Whisk together..."
  const descriptionSplit = splitChildrenAtDescription(children);

  if (descriptionSplit) {
    const { header, description } = descriptionSplit;

    return (
      <div className={cn("flex items-start gap-2", className)}>
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
          className="mt-1.5"
        />
        <div
          className={cn(
            "flex-1 transition-colors",
            checked && "text-muted-foreground"
          )}
        >
          <div className={cn("font-medium", checked && "line-through")}>
            {header}
          </div>
          <div
            className={cn(
              "text-sm text-muted-foreground mt-0.5 pl-2 border-l-2 border-muted ml-1",
              checked && "line-through"
            )}
          >
            {description}
          </div>
        </div>
      </div>
    );
  }

  // Default single-line rendering for items without prep instructions
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
        className="mt-1"
      />
      <span
        className={cn(
          "flex-1 transition-colors",
          checked && "text-muted-foreground line-through"
        )}
      >
        {children}
      </span>
    </div>
  );
}
