// Parser for recipes/m<N>-*.md and components/*.md. Both share one shape:
// folio (title + italic notes), optional "## Prepped Ingredients" blockquote,
// "## Ingredients" (with optional ### sections), "## Instructions" (###
// sections, numbered steps, bold run-in labels, footnotes), and bold-label
// trailer paragraphs (**To Store:**, **Used in:**, **Hot Tip** quotes, ...).

import { extractFolio } from "./parse-folio.js";
import { fuzzyScore, truncate, type FlagSink } from "./util.js";

export type ParsedIngredient = {
  section?: string;
  text: string;
  fromPrep: boolean;
};

export type ParsedStep = {
  section?: string;
  label?: string;
  displayNumber?: number;
  text: string;
  footnote?: string;
};

export type ParsedPrepped = {
  text: string;
  componentRef?: string; // raw slug from a `components/<slug>.md` mention
};

export type RecipeDoc = {
  title?: string;
  folioNotes: string[];
  // prose paragraphs between the folio and the first ## heading
  introParagraphs: string[];
  preppedIngredients: ParsedPrepped[];
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
  hotTip?: string;
  storageNote?: string;
  servingSuggestion?: string;
  // **Note:** / **Usage plan:** / other labeled trailers (label kept inline)
  extraNotes: string[];
  // trailers that belong on meals but have no field (e.g. **Save for Meal 2:**)
  strayTrailers: string[];
};

const COMPONENT_REF = /components\/([a-z0-9-]+)\.md/;
const FROM_PREP = /\(from (the )?prep|from the prep list|from your (sunday |make-ahead )?prep/i;

type Mode = "none" | "prepped" | "ingredients" | "instructions";

export function parseRecipeDoc(markdown: string, file: string, flags: FlagSink): RecipeDoc {
  const folio = extractFolio(markdown);
  const doc: RecipeDoc = {
    title: folio.title,
    folioNotes: folio.notes,
    introParagraphs: [],
    preppedIngredients: [],
    ingredients: [],
    steps: [],
    extraNotes: [],
    strayTrailers: [],
  };

  const lines = folio.body.split("\n");
  let mode: Mode = "none";
  let section: string | undefined;
  let pendingLabel: string | undefined;

  const lineNo = (i: number) => folio.bodyStartLine + i;

  const lastStep = () => (doc.steps.length > 0 ? doc.steps[doc.steps.length - 1] : undefined);
  const addFootnote = (text: string) => {
    const step = lastStep();
    if (step) {
      step.footnote = step.footnote ? `${step.footnote}\n\n${text}` : text;
      return true;
    }
    return false;
  };

  const setTrailer = (label: string, text: string, i: number) => {
    const full = text.trim();
    const key = label.toLowerCase().replace(/:$/, "").trim();
    if (key === "to store") {
      doc.storageNote = doc.storageNote ? `${doc.storageNote}\n\n${full}` : full;
    } else if (key === "serving suggestion") {
      doc.servingSuggestion = doc.servingSuggestion ? `${doc.servingSuggestion}\n\n${full}` : full;
    } else if (key === "used in") {
      // derivable from plan.json used_in — discard by design
    } else if (key === "note") {
      doc.extraNotes.push(full);
    } else {
      // e.g. **Usage plan:**, **To Reheat:**, **To Use:**, **Save for Meal 2:**
      doc.strayTrailers.push(`**${label}:** ${full}`);
      flags.add(file, lineNo(i), `nonstandard trailer "**${label}:**" (kept: component→notes, meal→last-step footnote)`);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line === "" || line === "---") continue;

    // headings switch modes/sections
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2 && !line.startsWith("###")) {
      const name = h2[1].trim().replace(/:$/, "").toLowerCase();
      if (name === "prepped ingredients") mode = "prepped";
      else if (name === "ingredients") mode = "ingredients";
      else if (name === "instructions") mode = "instructions";
      else {
        mode = "none";
        flags.add(file, lineNo(i), `unknown recipe section "## ${h2[1].trim()}" skipped`);
      }
      section = undefined;
      pendingLabel = undefined;
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      section = h3[1].trim().replace(/:$/, "");
      pendingLabel = undefined;
      continue;
    }

    // blockquotes: prepped list, hot tips, inline notes
    if (line.startsWith(">")) {
      const inner = line.replace(/^>\s?/, "").trim();
      if (inner === "") continue;
      const tip = inner.match(/^\*\*Hot Tip:?\*\*:?\s*(.*)$/i);
      if (tip) {
        // absorb continuation blockquote lines
        let text = tip[1];
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith(">")) {
          i++;
          const cont = lines[i].trim().replace(/^>\s?/, "");
          if (cont.trim() !== "") text += `\n${cont}`;
        }
        doc.hotTip = doc.hotTip ? `${doc.hotTip}\n\n${text.trim()}` : text.trim();
        continue;
      }
      if (mode === "prepped") {
        const item = inner.match(/^-\s+(.*)$/);
        if (item) {
          const ref = item[1].match(COMPONENT_REF);
          doc.preppedIngredients.push({ text: item[1].trim(), componentRef: ref?.[1] });
        }
        // non-item blockquote lines ("From your Sunday prep:") are boilerplate
        continue;
      }
      if (mode === "instructions") {
        // e.g. "> **Note:** Roast all 4 fillets..." between steps
        if (!addFootnote(inner)) flags.add(file, lineNo(i), `blockquote outside step context skipped: ${truncate(inner)}`);
        continue;
      }
      flags.add(file, lineNo(i), `unexpected blockquote skipped: ${truncate(inner)}`);
      continue;
    }

    // single-asterisk footnote paragraphs attach to the previous step,
    // or to the previous ingredient line when inside ## Ingredients.
    if (/^\*[^*]/.test(line)) {
      const text = line.replace(/^\*\s*/, "");
      if (mode === "ingredients" && doc.ingredients.length > 0) {
        const prev = doc.ingredients[doc.ingredients.length - 1];
        prev.text = `${prev.text} — _${text}_`;
        flags.add(file, lineNo(i), `ingredient footnote folded into previous line: ${truncate(text)}`);
      } else if (!addFootnote(text)) {
        flags.add(file, lineNo(i), `footnote with no preceding step skipped: ${truncate(text)}`);
      }
      continue;
    }

    // bold-label paragraphs: run-in labels inside instructions, trailers elsewhere
    const bold = line.match(/^\*\*([^*]+?)\*\*\s*(.*)$/);
    if (bold) {
      const label = bold[1].trim();
      let rest = bold[2].trim();
      const isTrailer = label.endsWith(":") || rest.length > 0;
      if (mode === "instructions" && rest === "") {
        pendingLabel = label.replace(/:$/, "");
        continue;
      }
      if (isTrailer) {
        // absorb wrapped continuation lines
        while (i + 1 < lines.length && lines[i + 1].trim() !== "" && !/^[-#>*☐|]|^\d+\.|^---/.test(lines[i + 1].trim())) {
          i++;
          rest += `\n${lines[i].trim()}`;
        }
        setTrailer(label.replace(/:$/, ""), rest, i);
        continue;
      }
    }

    // list items
    const item = line.match(/^-\s+(.*)$/);
    if (item) {
      if (mode === "ingredients") {
        doc.ingredients.push({ section, text: item[1].trim(), fromPrep: FROM_PREP.test(item[1]) });
        continue;
      }
      if (mode === "prepped") {
        const ref = item[1].match(COMPONENT_REF);
        doc.preppedIngredients.push({ text: item[1].trim(), componentRef: ref?.[1] });
        continue;
      }
      if (mode === "instructions") {
        // sub-bullet inside a step
        const step = lastStep();
        if (step) {
          step.text += `\n- ${item[1].trim()}`;
          continue;
        }
      }
      flags.add(file, lineNo(i), `list item outside a known section skipped: ${truncate(item[1])}`);
      continue;
    }

    // numbered steps
    const numbered = line.match(/^(\d+)\.\s+(.*)$/);
    if (numbered && mode === "instructions") {
      let text = numbered[2].trim();
      // absorb wrapped continuation lines (rare)
      while (i + 1 < lines.length && lines[i + 1].trim() !== "" && /^[^-#>*☐|\d]/.test(lines[i + 1].trim())) {
        i++;
        text += `\n${lines[i].trim()}`;
      }
      let label = pendingLabel;
      pendingLabel = undefined;
      const runIn = text.match(/^\*\*([^*]+):\*\*\s*(.+)$/s);
      if (runIn) {
        label = label ?? runIn[1].trim();
        text = runIn[2].trim();
      }
      doc.steps.push({ section, label, displayNumber: Number(numbered[1]), text });
      continue;
    }

    // prose before the first ## heading → intro paragraph
    if (mode === "none") {
      let text = line;
      while (i + 1 < lines.length && lines[i + 1].trim() !== "" && !/^[-#>*☐|]|^\d+\.|^---/.test(lines[i + 1].trim())) {
        i++;
        text += ` ${lines[i].trim()}`;
      }
      doc.introParagraphs.push(text);
      continue;
    }

    // italic asides inside instructions (timeline notes etc.)
    if (/^_.+_$/.test(line)) {
      flags.add(file, lineNo(i), `italic aside skipped: ${truncate(line)}`);
      continue;
    }

    flags.add(file, lineNo(i), `unparsed line skipped: ${truncate(line)}`);
  }

  return doc;
}

// Classify folio italic notes for a meal or component doc. `subtitle` (from
// plan.json) suppresses the duplicate subtitle note on meal recipes.
export function classifyFolioNotes(
  doc: RecipeDoc,
  kind: "meal" | "component",
  file: string,
  flags: FlagSink,
  subtitle?: string,
): { yieldLine?: string; attribution?: string; intro?: string } {
  let yieldLine: string | undefined;
  let attribution: string | undefined;
  let intro: string | undefined;
  for (const note of doc.folioNotes) {
    if (/^(makes|serves|yields?)\b/i.test(note)) {
      yieldLine = yieldLine ?? note;
    } else if (/^adapted from/i.test(note)) {
      attribution = attribution ?? note.replace(/^adapted from\s*/i, "Adapted from ");
    } else if (/^(with|served with|and|on|over|in)\b/i.test(note)) {
      // subtitle line — plan.json subtitle wins; discard by design
    } else if (subtitle !== undefined && fuzzyScore(note, subtitle) >= 0.7) {
      // restates the plan.json subtitle — discard by design
    } else if (kind === "component") {
      intro = intro ? `${intro} ${note}` : note;
    } else {
      flags.add(file, 0, `unclassified folio note on a meal recipe skipped: ${truncate(note)}`);
    }
  }
  return { yieldLine, attribution, intro };
}
