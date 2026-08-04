// grocery-list.md → grocery items. This file is the grocery source of truth;
// plan.json.grocery is only cross-checked (in build-payload). Heading →
// category map per the migration spec; "## Optional" → isOptional items;
// "Ingredient Consolidation Summary" sections are skipped by design.

import { extractFolio } from "./parse-folio.js";
import {
  parseGrams,
  splitLastParenthetical,
  stripMarkers,
  tokens,
  truncate,
  unwrapEmphasis,
  type FlagSink,
} from "./util.js";

export type ParsedGroceryItem = {
  category: string;
  isOptional: boolean;
  name: string;
  quantityText: string;
  grams?: number;
  note?: string;
  mealNumbers: number[];
};

const CATEGORY_MAP: Record<string, string> = {
  "produce": "produce",
  "proteins": "proteins",
  "suggested proteins": "proteins",
  "dairy & eggs": "dairy_eggs",
  "dairy": "dairy_eggs",
  "dairy & cheese": "dairy_eggs",
  "cheese": "cheese",
  "bakery": "bakery",
  "bakery & deli": "bakery",
  "refrigerated": "refrigerated",
  "frozen": "frozen",
  "shelf-stable": "shelf_stable",
  "shelf stable": "shelf_stable",
  "pantry": "shelf_stable",
};

type Mode = { kind: "category"; category: string; optional: boolean } | { kind: "skip" } | { kind: "key" };

export function parseGrocery(markdown: string, file: string, flags: FlagSink): ParsedGroceryItem[] {
  const folio = extractFolio(markdown);
  const items: ParsedGroceryItem[] = [];
  const lines = folio.body.split("\n");
  let mode: Mode = { kind: "key" }; // nothing counts until the first heading

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNo = folio.bodyStartLine + i;
    if (line === "" || line === "---") continue;

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2 && !line.startsWith("###")) {
      const title = h2[1].trim().replace(/:$/, "");
      const key = title.toLowerCase();
      if (key === "optional") {
        mode = { kind: "category", category: "other", optional: true };
      } else if (key.includes("consolidation")) {
        mode = { kind: "skip" };
        flags.add(file, lineNo, `"${title}" section skipped by design`);
      } else if (CATEGORY_MAP[key]) {
        mode = { kind: "category", category: CATEGORY_MAP[key], optional: false };
      } else {
        mode = { kind: "category", category: "other", optional: false };
        flags.add(file, lineNo, `unknown grocery heading "${title}" mapped to category "other"`);
      }
      continue;
    }

    if (line.startsWith("**KEY**")) {
      mode = { kind: "key" };
      continue;
    }
    if (mode.kind === "key") continue; // legend lines — discard by design
    if (mode.kind === "skip") continue; // consolidation table — flagged at heading

    const item = line.match(/^-\s+(.*)$/);
    if (!item) {
      flags.add(file, lineNo, `unparsed grocery line skipped: ${truncate(line)}`);
      continue;
    }

    const { text, mealNumbers } = stripMarkers(item[1]);
    // trailing "*" footnote markers → discard by design
    const cleaned = text.replace(/\s*\*+$/, "").trim();
    const { before, inside, after } = splitLastParenthetical(cleaned);

    const notes: string[] = [];
    let quantityText: string;
    let name: string;
    if (inside !== undefined) {
      name = before;
      // note text inside the parens after an em-dash
      const dash = inside.lastIndexOf(" — ");
      if (dash >= 0) {
        quantityText = inside.slice(0, dash).trim();
        notes.push(inside.slice(dash + 3).trim());
      } else {
        quantityText = inside;
      }
    } else {
      // no parenthetical: an " — note" suffix may still be present
      name = cleaned;
      const dash = name.indexOf(" — ");
      if (dash >= 0) {
        notes.push(unwrapEmphasis(name.slice(dash + 3).trim()));
        name = name.slice(0, dash).trim();
      }
      quantityText = "—";
      flags.add(file, lineNo, `grocery item without quantity: "${truncate(name)}" (quantity set to "—")`);
    }
    if (after !== "") {
      const extra = unwrapEmphasis(after.replace(/^[—–,;]\s*/, "").trim());
      if (extra !== "") notes.push(extra);
    }
    if (name === "" && quantityText !== "—") {
      // line was entirely parenthetical — unlikely; keep lossless
      name = quantityText;
      quantityText = "—";
      flags.add(file, lineNo, `grocery item with no name text: ${truncate(cleaned)}`);
    }

    items.push({
      category: mode.category,
      isOptional: mode.optional,
      name,
      quantityText,
      grams: parseGrams(quantityText),
      note: notes.length > 0 ? notes.join("; ") : undefined,
      mealNumbers,
    });
  }

  return items;
}

// Cross-check plan.json's grocery skeleton against the md truth: every json
// item should have an md counterpart by (fuzzy-normalized) name.
export function crossCheckGrocery(
  jsonGrocery: Record<string, { item: string; quantity?: string }[]> | undefined,
  mdItems: ParsedGroceryItem[],
  file: string,
  flags: FlagSink,
): void {
  if (!jsonGrocery) return;
  // crude singular/plural stem — only used for this fuzzy cross-check
  const stem = (list: string[]) => new Set(list.map((t) => t.replace(/(es|s)$/, "")));
  const mdTokenSets = mdItems.map((i) => stem(tokens(i.name)));
  for (const [category, entries] of Object.entries(jsonGrocery)) {
    for (const entry of entries ?? []) {
      const wanted = stem(tokens(entry.item));
      const hit = mdTokenSets.some((n) => {
        const smaller = n.size <= wanted.size ? n : wanted;
        const larger = n.size <= wanted.size ? wanted : n;
        return smaller.size > 0 && [...smaller].every((token) => larger.has(token));
      });
      if (!hit) {
        flags.add(file, 0, `plan.json grocery "${entry.item}" (${category}) has no md counterpart (md wins)`);
      }
    }
  }
}
