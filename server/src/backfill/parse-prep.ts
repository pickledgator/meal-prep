// prep-list.md → prep sections/tasks/allocations. Two source generations:
//
// Canonical (arrow format, June 2026+): `## Section (⏱ ...)` headings,
// `☐ **Title** — steps 1–4 in \`components/x.md\`¹³` tasks, ingredient
// parents `- ☐ **Name — qty**` with `  - qty → prep → dest` children, and
// `_— CLEANING BREAK —_` dividers.
//
// Legacy (Jan–Mar 2026): inline `- ☐ Name (qty; prep)¹²🫙` ingredients,
// `Allocate: a | b | c` pipe children, and free-form task bodies. Content
// preservation wins over structure; anything fuzzy is flagged.

import {
  normalizeName,
  splitParenthetical,
  splitTopLevel,
  stripMarkers,
  tokens,
  truncate,
  unwrapEmphasis,
  type FlagSink,
} from "./util.js";

export type ParsedDestination =
  | { kind: "component"; componentSlug: string }
  | { kind: "storage"; storageLabel: string }
  | { kind: "text"; text: string };

export type ParsedAllocation = {
  quantityText: string;
  prepText?: string;
  destination: ParsedDestination;
  sundayConsumed: boolean;
  mealNumbers: number[];
};

export type ParsedPrepTask = {
  taskType: "task" | "ingredient";
  title: string;
  quantityText?: string;
  componentSlug?: string;
  stepRangeText?: string;
  body?: string;
  mealNumbers: number[];
  allocations: ParsedAllocation[];
};

export type ParsedPrepSection = {
  kind: "tasks" | "break";
  title: string;
  timeEstimate?: string;
  tasks: ParsedPrepTask[];
};

export type PrepContext = {
  // secondary = file-only components not listed in plan.json (possible stale
  // drafts) — they lose ambiguity ties against plan.json components
  components: { slug: string; name: string; secondary?: boolean }[];
  componentFileAliases: Record<string, string>; // md file basename → plan.json slug
  destinationAliases: Record<string, string>; // normalized destination text → slug
};

// ---------- destination resolution ----------

const FILLER_PREFIX =
  /^(?:used\s+(?:today\s+)?(?:in|for|on)\s+(?:the\s+)?|for\s+(?:the\s+)?|into\s+(?:the\s+)?|goes\s+(?:in|into)\s+(?:the\s+)?|to\s+(?:the\s+)?|in\s+(?:the\s+)?)/i;

function resolveComponentBySlugOrName(core: string, ctx: PrepContext): string | undefined {
  const ncore = normalizeName(core);
  if (ncore === "") return undefined;
  if (ctx.destinationAliases[ncore]) return ctx.destinationAliases[ncore];
  for (const c of ctx.components) {
    if (normalizeName(c.name) === ncore || normalizeName(c.slug) === ncore) return c.slug;
  }
  // conservative containment: a unique component whose full name appears in
  // the text (or vice versa) with at most 2 extra tokens
  const coreTokens = tokens(core);
  let hits: { slug: string; extra: number; secondary: boolean }[] = [];
  for (const c of ctx.components) {
    const name = normalizeName(c.name);
    const nameTokens = tokens(c.name);
    const secondary = c.secondary === true;
    if (ncore.includes(name)) hits.push({ slug: c.slug, extra: coreTokens.length - nameTokens.length, secondary });
    else if (name.includes(ncore)) hits.push({ slug: c.slug, extra: nameTokens.length - coreTokens.length, secondary });
  }
  if (hits.length > 1 && hits.some((h) => !h.secondary)) hits = hits.filter((h) => !h.secondary);
  if (hits.length === 1 && hits[0].extra <= 2) return hits[0].slug;
  return undefined;
}

// prefix words that still read as "this goes to <storage label>"
const STORAGE_PREFIX_WORDS = new Set([
  "store",
  "stored",
  "pack",
  "packed",
  "label",
  "labeled",
  "labelled",
  "wrap",
  "wrapped",
  "for",
  "into",
  "in",
  "to",
  "the",
  "a",
  "goes",
]);

function resolveDestination(
  rawDest: string,
  ctx: PrepContext,
  file: string,
  line: number,
  flags: FlagSink,
): { destination: ParsedDestination; sundayConsumed: boolean; mealNumbers: number[]; trailingNote?: string } {
  const { text, mealNumbers, jar } = stripMarkers(rawDest);
  let cleaned = text.trim().replace(/[.,;]+$/, "").trim();
  cleaned = unwrapEmphasis(cleaned);

  // quoted storage labels: `"M1 — bowls"` / `store labeled "M2 — meatballs"`
  const quoted = cleaned.match(/^(.*?)["“](.+?)["”](.*)$/);
  if (quoted) {
    const prefix = quoted[1].trim();
    const prefixWords = tokens(prefix);
    const isStorage = prefix === "" || (prefixWords.length > 0 && prefixWords.every((w) => STORAGE_PREFIX_WORDS.has(w)));
    if (isStorage) {
      let label = quoted[2].trim().replace(/[,.]$/, "");
      const suffix = quoted[3].trim().replace(/^[;,.\s]+/, "");
      if (suffix !== "") label = `${label}; ${suffix}`;
      return { destination: { kind: "storage", storageLabel: label }, sundayConsumed: jar, mealNumbers };
    }
  }

  // a trailing italic/parenthetical aside shouldn't block component matching;
  // if the rest resolves, the aside is handed back for the prep text
  let core = cleaned;
  let trailingNote: string | undefined;
  const aside = cleaned.match(/^(.*?)\s*(_\(.*\)_|\(.*\))$/);
  if (aside && aside[1].trim() !== "") {
    core = aside[1].trim();
    trailingNote = aside[2].trim();
  }

  const stripped = core.replace(FILLER_PREFIX, "").trim();
  const slug = resolveComponentBySlugOrName(stripped, ctx) ?? resolveComponentBySlugOrName(core, ctx);
  if (slug) {
    return { destination: { kind: "component", componentSlug: slug }, sundayConsumed: jar, mealNumbers, trailingNote };
  }
  if (jar) {
    flags.add(file, line, `🫙 destination did not resolve to a component (kept as text): ${truncate(cleaned)}`);
  }
  const fallback = cleaned === "" ? "—" : cleaned;
  return { destination: { kind: "text", text: fallback }, sundayConsumed: jar, mealNumbers };
}

// ---------- legacy allocation segments ----------

const QTY_UNIT =
  "(?:cloves?|tsp|Tbsp|tbsp|cups?|cup|oz|g|kg|ml|lb|lbs|ears?|sprigs?|stalks?|heads?|bunch(?:es)?|pieces?|slices?|cans?|blocks?|leaves)";
const QTY_RE = new RegExp(`^(all|both|rest|remainder|~?[\\d¼½¾⅓⅔⅛][^\\s;]*(?:\\s+${QTY_UNIT})?)\\s+(.+)$`, "i");

function legacyAllocation(
  segment: string,
  ctx: PrepContext,
  file: string,
  line: number,
  flags: FlagSink,
): ParsedAllocation {
  const { text, mealNumbers, jar } = stripMarkers(segment);
  let quantityText = "all";
  let rest = text.trim();

  const semi = rest.indexOf(";");
  if (semi > 0 && semi < rest.length - 1 && /^[~\d¼½¾⅓⅔⅛]/.test(rest)) {
    quantityText = rest.slice(0, semi).trim();
    rest = rest.slice(semi + 1).trim();
  } else {
    const qty = rest.match(QTY_RE);
    if (qty) {
      quantityText = qty[1].trim();
      rest = qty[2].trim();
    }
  }

  // best-effort `minced (dest)` split: short verb phrase + parenthetical
  let prepText: string | undefined;
  let destText = rest;
  const paren = rest.match(/^(.*?)\s*\(([^()]+)\)$/);
  if (paren) {
    const pre = paren[1].trim();
    const preWords = pre === "" ? 0 : pre.split(/\s+/).length;
    if (preWords > 0 && preWords <= 3 && !/^(for|in|into|to)\b/i.test(pre)) {
      prepText = pre;
      destText = paren[2].trim();
    }
  }
  // single inline arrow inside a legacy segment: `finely dice → salsa`
  // (multi-arrow lines describe several destinations — keep those lossless)
  const arrowParts = destText.split("→").map((p) => p.trim());
  if (arrowParts.length === 2 && arrowParts[0] !== "" && arrowParts[1] !== "") {
    prepText = prepText ? `${prepText} — ${arrowParts[0]}` : arrowParts[0];
    destText = arrowParts[1];
  }

  const resolved = resolveDestination(destText, ctx, file, line, flags);
  return {
    quantityText,
    prepText: withNote(prepText, resolved),
    destination: resolved.destination,
    sundayConsumed: jar || resolved.sundayConsumed,
    mealNumbers: mealNumbers.length > 0 ? mealNumbers : resolved.mealNumbers,
  };
}

// fold a trailing aside back into the prep text when the destination became
// a bare component link (so the aside isn't lost)
function withNote(
  prepText: string | undefined,
  resolved: { destination: ParsedDestination; trailingNote?: string },
): string | undefined {
  if (resolved.destination.kind !== "component" || resolved.trailingNote === undefined) return prepText;
  return prepText ? `${prepText} ${resolved.trailingNote}` : resolved.trailingNote;
}

// ---------- arrow allocation children ----------

function arrowAllocation(
  content: string,
  ctx: PrepContext,
  file: string,
  line: number,
  flags: FlagSink,
): ParsedAllocation {
  const { text, mealNumbers, jar } = stripMarkers(content);
  const parts = text
    .split("→")
    .map((p) => p.trim())
    .filter((p) => p !== "");
  const quantityText = parts[0] && parts.length > 1 ? parts[0] : "all";
  let prepText: string | undefined;
  let destText: string;
  if (parts.length >= 3) {
    prepText = parts.slice(1, -1).join(" → ");
    destText = parts[parts.length - 1];
  } else if (parts.length === 2) {
    const rest = parts[1];
    const semi = rest.lastIndexOf(";");
    if (semi > 0) {
      prepText = rest.slice(0, semi).trim();
      destText = rest.slice(semi + 1).trim();
    } else {
      destText = rest;
    }
  } else {
    destText = parts[0] ?? content;
  }
  const resolved = resolveDestination(destText, ctx, file, line, flags);
  return {
    quantityText,
    prepText: withNote(prepText, resolved),
    destination: resolved.destination,
    sundayConsumed: jar || resolved.sundayConsumed,
    mealNumbers: mealNumbers.length > 0 ? mealNumbers : resolved.mealNumbers,
  };
}

// ---------- task line parsing ----------

const STEPS_IN_RE = /^[—–-]?\s*(steps?\s[^`]+?)\s+in\s+`components\/([a-z0-9-]+)\.md`\s*(.*)$/i;
const SEE_RE = /^[—–-]?\s*(?:see\s+)?`components\/([a-z0-9-]+)\.md`\s*(.*)$/i;

function parseTaskLine(
  content: string,
  bodyLines: string[],
  ctx: PrepContext,
  file: string,
  line: number,
  flags: FlagSink,
): ParsedPrepTask {
  const { text, mealNumbers } = stripMarkers(content);
  let title = text.trim();
  let rest = "";
  const bold = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (bold) {
    title = bold[1].trim();
    rest = bold[2].trim();
  } else {
    flags.add(file, line, `prep task without bold title parsed loosely: ${truncate(text)}`);
  }

  let quantityText: string | undefined;
  let stepRangeText: string | undefined;
  let componentSlug: string | undefined;

  if (rest.startsWith("(")) {
    const { inside, after } = splitParenthetical(rest);
    if (inside !== undefined) {
      if (/^steps?\b/i.test(inside)) stepRangeText = inside;
      else quantityText = inside;
      rest = after;
    }
  }

  let leftover = rest;
  const stepsIn = rest.match(STEPS_IN_RE);
  const see = stepsIn ? null : rest.match(SEE_RE);
  if (stepsIn) {
    stepRangeText = stepRangeText ?? stepsIn[1].trim();
    componentSlug = stepsIn[2];
    leftover = stepsIn[3].trim();
  } else if (see) {
    componentSlug = see[1];
    leftover = see[2].trim();
  }

  if (componentSlug) {
    componentSlug = ctx.componentFileAliases[componentSlug] ?? componentSlug;
    if (!ctx.components.some((c) => c.slug === componentSlug)) {
      flags.add(file, line, `prep task "${title}" links unknown component "${componentSlug}"; kept as body text`);
      leftover = rest; // restore the raw reference so nothing is lost
      componentSlug = undefined;
      stepRangeText = undefined;
    }
  }

  leftover = leftover.replace(/^[—–]\s*/, "").trim();
  const bodyParts = [leftover, ...bodyLines.map((l) => l.trim())].filter((l) => l !== "");

  if (componentSlug !== undefined && bodyParts.length > 0) {
    flags.add(
      file,
      line,
      `note after component-linked task "${title}" dropped (componentSlug XOR body): ${truncate(bodyParts.join(" "))}`,
    );
    return { taskType: "task", title, quantityText, componentSlug, stepRangeText, mealNumbers, allocations: [] };
  }

  const body = bodyParts.length > 0 ? bodyParts.join("\n\n") : undefined;
  return { taskType: "task", title, quantityText, componentSlug, stepRangeText, body, mealNumbers, allocations: [] };
}

// ---------- ingredient parent parsing ----------

function parseIngredientPieces(
  content: string,
  ctx: PrepContext,
  file: string,
  line: number,
  flags: FlagSink,
): ParsedPrepTask[] {
  // canonical bold parent: `**Name — qty**`
  const bold = content.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (bold) {
    const { text, mealNumbers } = stripMarkers(bold[1]);
    const trailing = stripMarkers(bold[2]).text.trim();
    if (trailing !== "") flags.add(file, line, `text after bold ingredient parent ignored: ${truncate(trailing)}`);
    const dash = text.indexOf(" — ");
    const title = dash >= 0 ? text.slice(0, dash).trim() : text.trim();
    const quantityText = dash >= 0 ? text.slice(dash + 3).trim() : undefined;
    const parentMarks = stripMarkers(bold[1] + bold[2]);
    return [
      {
        taskType: "ingredient",
        title,
        quantityText,
        mealNumbers: mealNumbers.length > 0 ? mealNumbers : parentMarks.mealNumbers,
        allocations: [],
      },
    ];
  }

  // legacy inline: `Name (qty; prep)¹²🫙 — dest` with optional ` | ` siblings.
  // Markers are stripped per-segment so allocations keep their own meal refs;
  // the task itself carries the union of every marker on the line.
  const pieces = splitTopLevel(content, "|");
  const tasks: ParsedPrepTask[] = [];
  for (const piece of pieces) {
    const pieceMarks = stripMarkers(piece);
    const jar = pieceMarks.jar;
    const { before, inside, after } = splitParenthetical(piece);
    const title = stripMarkers(before).text.trim() || pieceMarks.text.trim();
    const task: ParsedPrepTask = {
      taskType: "ingredient",
      title,
      mealNumbers: pieceMarks.mealNumbers,
      allocations: [],
    };

    const remainder = stripMarkers(after).text.replace(/^[—–]\s*/, "").replace(/^[-:;,]\s*/, "").trim();
    const rawRemainder = after.replace(/^[—–]\s*/, "").replace(/^[-:;,]\s*/, "").trim();
    let parenAllocText: string | undefined;

    if (inside !== undefined) {
      const segments = splitTopLevel(inside, "|");
      if (segments.length > 1) {
        for (const seg of segments) task.allocations.push(legacyAllocation(seg, ctx, file, line, flags));
      } else {
        const seg = segments[0] ?? "";
        const semi = seg.indexOf(";");
        const qtyish = /^(?:~?[\d¼½¾⅓⅔⅛]|all\b|both\b|one\b)/i;
        if (semi > 0 && qtyish.test(seg.slice(0, semi).trim())) {
          task.quantityText = stripMarkers(seg.slice(0, semi)).text.trim();
          parenAllocText = seg.slice(semi + 1).trim();
        } else if (qtyish.test(seg) && !seg.includes(";") && !seg.includes("→")) {
          task.quantityText = stripMarkers(seg).text.trim();
        } else if (seg !== "") {
          parenAllocText = seg;
        }
      }
    }

    if (parenAllocText !== undefined || remainder !== "") {
      let prepText: string | undefined;
      let destText: string;
      if (parenAllocText !== undefined && remainder !== "") {
        prepText = stripMarkers(parenAllocText).text.trim();
        destText = rawRemainder;
      } else {
        destText = parenAllocText ?? rawRemainder;
      }
      // single inline arrow: `pit & ¼" dice → salsa`
      const arrowParts = destText.split("→").map((s) => s.trim());
      if (arrowParts.length === 2 && arrowParts[0] !== "" && arrowParts[1] !== "") {
        const pre = stripMarkers(arrowParts[0]).text.trim();
        prepText = prepText ? `${prepText} — ${pre}` : pre;
        destText = arrowParts[1];
      }
      const resolved = resolveDestination(destText, ctx, file, line, flags);
      task.allocations.push({
        quantityText: "all",
        prepText: withNote(prepText, resolved),
        destination: resolved.destination,
        sundayConsumed: jar || resolved.sundayConsumed,
        mealNumbers: resolved.mealNumbers,
      });
    }

    // parent-level 🫙 with multiple allocations: only component-bound ones
    if (jar && task.allocations.length > 1) {
      for (const alloc of task.allocations) {
        if (alloc.destination.kind === "component") alloc.sundayConsumed = true;
      }
    } else if (jar && task.allocations.length === 1) {
      task.allocations[0].sundayConsumed = true;
    }

    tasks.push(task);
  }
  return tasks;
}

// ---------- main ----------

export function parsePrep(
  body: string,
  bodyStartLine: number,
  file: string,
  ctx: PrepContext,
  flags: FlagSink,
): ParsedPrepSection[] {
  const sections: ParsedPrepSection[] = [];
  const lines = body.split("\n");

  let current: ParsedPrepSection | undefined;
  let h2Title: string | undefined;
  let implicitFlagged = false;
  let keyMode = false;
  let skipStorage = false;
  let lastBreak: ParsedPrepSection | undefined;
  let currentIngredient: ParsedPrepTask | undefined;

  const lineNo = (i: number) => bodyStartLine + i;

  const ensureSection = (i: number): ParsedPrepSection => {
    if (!current) {
      current = { kind: "tasks", title: "Prep Tasks", tasks: [] };
      sections.push(current);
      if (!implicitFlagged) {
        flags.add(file, lineNo(i), `content before first section heading grouped under "Prep Tasks"`);
        implicitFlagged = true;
      }
    }
    return current;
  };

  const extractTime = (title: string): { title: string; timeEstimate?: string } => {
    let timeEstimate: string | undefined;
    let out = title;
    const paren = out.match(/^(.*?)\s*\(⏱\s*([^)]+)\)\s*$/);
    if (paren) {
      out = paren[1].trim();
      timeEstimate = paren[2].trim();
    } else {
      const dash = out.match(/^(.*?)\s*[—–-]\s*⏱\s*(.+)$/);
      if (dash) {
        out = dash[1].trim();
        timeEstimate = dash[2].trim();
      }
    }
    return { title: out, timeEstimate };
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line === "" || line === "---") continue;
    if (keyMode) continue;

    if (line.startsWith("**KEY**")) {
      keyMode = true;
      continue;
    }

    // headings
    const h = line.match(/^(#{2,3})\s+(.+)$/);
    if (h) {
      skipStorage = false;
      currentIngredient = undefined;
      lastBreak = undefined;
      const { title, timeEstimate } = extractTime(h[2].trim());
      if (/^storage notes?$/i.test(title)) {
        skipStorage = true;
        flags.add(file, lineNo(i), `"${title}" section skipped (no schema home)`);
        continue;
      }
      if (h[1] === "##") {
        h2Title = title;
        current = { kind: "tasks", title, timeEstimate, tasks: [] };
        sections.push(current);
      } else {
        // H3 subsection — fold into "<h2> — <h3>"; drop the empty H2 shell
        if (current && current.kind === "tasks" && current.tasks.length === 0 && current.title === h2Title) {
          sections.pop();
        }
        const combined = h2Title ? `${h2Title} — ${title}` : title;
        current = { kind: "tasks", title: combined, timeEstimate, tasks: [] };
        sections.push(current);
      }
      continue;
    }

    if (skipStorage) {
      flags.add(file, lineNo(i), `storage-notes content skipped: ${truncate(line)}`);
      continue;
    }

    // table rows (storage tables without a heading guard)
    if (line.startsWith("|")) {
      flags.add(file, lineNo(i), `table row skipped (no schema home): ${truncate(line)}`);
      continue;
    }

    // stage directions: `→ _serve **Heavy Apps**_`
    if (line.startsWith("→")) {
      flags.add(file, lineNo(i), `stage direction skipped: ${truncate(line)}`);
      continue;
    }

    // italic lines: breaks, break continuations, or task asides
    if (/^_.+_$/.test(line)) {
      const inner = unwrapEmphasis(line);
      if (/CLEANING BREAK/i.test(inner)) {
        const title = inner.replace(/^[—–\s]+/, "").replace(/[—–\s]+$/, "").trim();
        const brk: ParsedPrepSection = { kind: "break", title: title === "" ? "CLEANING BREAK" : title, tasks: [] };
        sections.push(brk);
        lastBreak = brk;
        current = undefined;
        currentIngredient = undefined;
        continue;
      }
      if (lastBreak) {
        lastBreak.title = `${lastBreak.title} — ${inner}`;
        continue;
      }
      flags.add(file, lineNo(i), `italic aside skipped: ${truncate(inner)}`);
      continue;
    }

    // blockquote callouts → tasks (e.g. "> **Before Sunday** ❄️ — Move the brisket…")
    if (line.startsWith(">")) {
      const inner = line.replace(/^>\s?/, "").trim();
      const bold = inner.match(/^\*\*([^*]+?)\*\*\s*(.*)$/);
      if (bold) {
        const { text, mealNumbers } = stripMarkers(bold[2]);
        const body = text.replace(/^[—–]\s*/, "").trim();
        ensureSection(i).tasks.push({
          taskType: "task",
          title: bold[1].trim(),
          body: body === "" ? undefined : body,
          mealNumbers,
          allocations: [],
        });
        lastBreak = undefined;
      } else {
        flags.add(file, lineNo(i), `blockquote skipped: ${truncate(inner)}`);
      }
      continue;
    }

    // checkbox tasks
    if (line.startsWith("☐")) {
      lastBreak = undefined;
      currentIngredient = undefined;
      const bodyLines: string[] = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const t = next.trim();
        if (t === "" || t === "---" || /^(☐|-\s+☐|#{2,3}\s|\*\*KEY\*\*|→|\||>)/.test(t)) break;
        bodyLines.push(t);
        i++;
      }
      const task = parseTaskLine(line.replace(/^☐\s*/, ""), bodyLines, ctx, file, lineNo(i), flags);
      ensureSection(i).tasks.push(task);
      continue;
    }

    // ingredient parents and children
    const parent = line.match(/^-\s+☐\s+(.*)$/);
    const child = /^\s+-\s+/.test(raw) ? raw.match(/^\s+-\s+(.*)$/) : null;
    if (parent && !/^\s/.test(raw)) {
      lastBreak = undefined;
      const tasks = parseIngredientPieces(parent[1].trim(), ctx, file, lineNo(i), flags);
      ensureSection(i).tasks.push(...tasks);
      currentIngredient = tasks[tasks.length - 1];
      continue;
    }
    if (child) {
      const content = child[1].trim();
      if (!currentIngredient) {
        flags.add(file, lineNo(i), `orphan allocation line skipped: ${truncate(content)}`);
        continue;
      }
      const alloc = content.match(/^Allocate:\s*(.*)$/i);
      if (alloc) {
        for (const seg of splitTopLevel(alloc[1], "|")) {
          currentIngredient.allocations.push(legacyAllocation(seg, ctx, file, lineNo(i), flags));
        }
      } else if (content.includes("→")) {
        currentIngredient.allocations.push(arrowAllocation(content, ctx, file, lineNo(i), flags));
      } else {
        // plain child note → lossless text allocation
        const { text, mealNumbers, jar } = stripMarkers(content);
        currentIngredient.allocations.push({
          quantityText: "all",
          destination: { kind: "text", text: text.trim() === "" ? "—" : text.trim() },
          sundayConsumed: jar,
          mealNumbers,
        });
      }
      continue;
    }

    // reminder bullets: `- **Meal 2:** Mix & form the meatballs…`
    const reminder = line.match(/^-\s+\*\*([^*]+?):?\*\*\s*(.*)$/);
    if (reminder && !/^\s/.test(raw)) {
      lastBreak = undefined;
      currentIngredient = undefined;
      const { text, mealNumbers } = stripMarkers(reminder[2]);
      ensureSection(i).tasks.push({
        taskType: "task",
        title: reminder[1].trim(),
        body: text.trim() === "" ? undefined : text.trim(),
        mealNumbers,
        allocations: [],
      });
      continue;
    }

    // bold-paragraph blocks at top level (Goal:, Storage notes:, …)
    const boldPara = line.match(/^\*\*([^*]+?):?\*\*\s*(.*)$/);
    if (boldPara) {
      if (/^storage notes?$/i.test(boldPara[1].trim())) {
        skipStorage = true;
        flags.add(file, lineNo(i), `"${boldPara[1].trim()}" block skipped (no schema home)`);
      } else {
        flags.add(file, lineNo(i), `bold paragraph skipped: ${truncate(line)}`);
      }
      continue;
    }

    flags.add(file, lineNo(i), `unparsed prep line skipped: ${truncate(line)}`);
  }

  // drop empty tasks-sections (e.g. headings whose content was all flagged)
  return sections.filter((s) => {
    if (s.kind === "break" || s.tasks.length > 0) return true;
    flags.add(file, 0, `empty prep section "${s.title}" dropped`);
    return false;
  });
}
