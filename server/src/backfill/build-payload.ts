// Assemble one plans/<slug>/ folder into a PlanPayload (unvalidated input
// shape — the CLI runs planPayloadSchema over the result). plan.json is the
// trusted skeleton; the markdown files are the content source of truth.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { z } from "zod";
import type { planPayloadSchema } from "shared";
import { extractFolio } from "./parse-folio.js";
import { parseEssentials } from "./parse-essentials.js";
import { crossCheckGrocery, parseGrocery } from "./parse-grocery.js";
import { parseMenu } from "./parse-menu.js";
import { parsePrep, type PrepContext } from "./parse-prep.js";
import { classifyFolioNotes, parseRecipeDoc, type RecipeDoc } from "./parse-recipe.js";
import { overridesFor } from "./overrides.js";
import { fuzzyScore, makeFlagSink, normalizeName, truncate, type Flag } from "./util.js";

export type PlanPayloadInput = z.input<typeof planPayloadSchema>;

export type BuildResult = {
  slug: string;
  payload: PlanPayloadInput;
  flags: Flag[];
};

type PlanJson = {
  week_of?: string;
  folder_name?: string;
  generated_at?: string;
  servings?: number;
  leftovers?: boolean;
  theme?: string;
  difficulty?: string;
  meals: {
    id: string;
    name: string;
    subtitle?: string;
    protein: string;
    protein_category: string;
    cuisine: string;
    components?: string[];
    key_ingredients?: string[];
    prep_time_minutes?: number;
    cook_time_minutes?: number;
  }[];
  components?: {
    id: string;
    name: string;
    type: string;
    yield?: string;
    notes?: string;
    used_in?: string[];
  }[];
  grocery?: Record<string, { item: string; quantity?: string; meals?: string[] }[]>;
  [key: string]: unknown;
};

const KNOWN_TOP_KEYS = new Set([
  "week_of",
  "folder_name",
  "generated_at",
  "servings",
  "leftovers",
  "theme",
  "difficulty",
  "meals",
  "components",
  "grocery",
]);

export function buildPlanPayload(plansDir: string, slug: string): BuildResult {
  const flags: Flag[] = [];
  const sink = makeFlagSink(flags);
  const dir = join(plansDir, slug);
  const json = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8")) as PlanJson;
  const overrides = overridesFor(slug);

  // ---------- skeleton ----------

  const weekOf = slug.slice(0, 10);
  const metadata: Record<string, unknown> = {};
  if (json.week_of !== undefined && json.week_of !== weekOf) {
    metadata.originalWeekOf = json.week_of;
    sink.add("plan.json", 0, `week_of "${json.week_of}" disagrees with folder-derived "${weekOf}" (folder wins)`);
  }
  for (const [key, value] of Object.entries(json)) {
    if (!KNOWN_TOP_KEYS.has(key)) metadata[key] = value;
  }

  let generatedAt = json.generated_at ?? "";
  if (generatedAt === "" || Number.isNaN(Date.parse(generatedAt))) {
    generatedAt = `${weekOf}T12:00:00Z`;
    sink.add("plan.json", 0, `generated_at missing/unparseable — synthesized ${generatedAt}`);
  }

  const difficultyRaw = json.difficulty ?? "normal";
  const difficulty = (["easy", "normal", "challenging"].includes(difficultyRaw) ? difficultyRaw : "normal") as
    | "easy"
    | "normal"
    | "challenging";
  if (difficulty !== difficultyRaw) sink.add("plan.json", 0, `unknown difficulty "${difficultyRaw}" defaulted to "normal"`);

  // ---------- components (plan.json list + md cards) ----------

  const componentsDir = join(dir, "components");
  const componentFiles = existsSync(componentsDir) ? readdirSync(componentsDir).filter((f) => f.endsWith(".md")) : [];
  const fileAliases = overrides.componentFileAliases ?? {};
  const cardFileForSlug = new Map<string, string>(); // plan slug → file basename
  for (const f of componentFiles) {
    const fileSlug = basename(f, ".md");
    const target = fileAliases[fileSlug] ?? fileSlug;
    cardFileForSlug.set(target, f);
    if (fileAliases[fileSlug]) {
      sink.add(`components/${f}`, 0, `card attached to plan.json component "${target}" via overrides alias`);
    }
  }

  type ComponentDraft = {
    slug: string;
    name: string;
    type: string;
    yieldText?: string;
    intro?: string;
    attribution?: string;
    storageNote?: string;
    hotTip?: string;
    notes?: string;
    ingredients: { section?: string; text: string; fromPrep: boolean; refComponentSlug?: string }[];
    steps: { section?: string; label?: string; displayNumber?: number; text: string; footnote?: string }[];
    fromFileOnly: boolean;
  };

  const componentDrafts: ComponentDraft[] = [];
  const consumedFiles = new Set<string>();

  const parseComponentCard = (file: string): RecipeDoc => {
    const md = readFileSync(join(componentsDir, file), "utf8");
    return parseRecipeDoc(md, `components/${file}`, sink);
  };

  for (const c of json.components ?? []) {
    const draft: ComponentDraft = {
      slug: c.id,
      name: c.name,
      type: c.type,
      yieldText: c.yield,
      notes: c.notes,
      ingredients: [],
      steps: [],
      fromFileOnly: false,
    };
    const file = cardFileForSlug.get(c.id);
    if (file) {
      consumedFiles.add(file);
      const doc = parseComponentCard(file);
      const { yieldLine, attribution, intro } = classifyFolioNotes(doc, "component", `components/${file}`, sink);
      if (yieldLine) {
        // "_Makes about 1 cup — the week's workhorse: …_" → yield + intro
        const dash = yieldLine.indexOf(" — ");
        if (dash >= 0) {
          draft.yieldText = yieldLine.slice(0, dash).trim();
          draft.intro = yieldLine.slice(dash + 3).trim();
        } else {
          draft.yieldText = yieldLine;
        }
      }
      const introParts = [draft.intro ?? intro, ...doc.introParagraphs].filter(
        (p): p is string => p !== undefined && p !== "",
      );
      draft.intro = introParts.length > 0 ? introParts.join("\n\n") : undefined;
      draft.attribution = attribution;
      draft.storageNote = doc.storageNote;
      draft.hotTip = doc.hotTip;
      const noteParts = [c.notes, ...doc.extraNotes, ...doc.strayTrailers].filter(
        (n): n is string => n !== undefined && n !== "",
      );
      draft.notes = noteParts.length > 0 ? noteParts.join("\n\n") : undefined;
      draft.ingredients = doc.ingredients.map((l) => ({ ...l }));
      draft.steps = doc.steps;
      if (doc.servingSuggestion) {
        sink.add(`components/${file}`, 0, `serving suggestion on a component folded into notes`);
        draft.notes = draft.notes ? `${draft.notes}\n\n${doc.servingSuggestion}` : doc.servingSuggestion;
      }
    }
    componentDrafts.push(draft);
  }

  // component md files that plan.json doesn't list → include tentatively
  for (const f of componentFiles) {
    if (consumedFiles.has(f)) continue;
    const fileSlug = basename(f, ".md");
    const doc = parseComponentCard(f);
    const { yieldLine, attribution, intro } = classifyFolioNotes(doc, "component", `components/${f}`, sink);
    sink.add(`components/${f}`, 0, `component file not listed in plan.json — included with slug "${fileSlug}"`);
    componentDrafts.push({
      slug: fileSlug,
      name: doc.title ?? fileSlug,
      type: "component",
      yieldText: yieldLine,
      intro: [intro, ...doc.introParagraphs].filter((p) => p !== undefined && p !== "").join("\n\n") || undefined,
      attribution,
      storageNote: doc.storageNote,
      hotTip: doc.hotTip,
      notes: [...doc.extraNotes, ...doc.strayTrailers].join("\n\n") || undefined,
      ingredients: doc.ingredients.map((l) => ({ ...l })),
      steps: doc.steps,
      fromFileOnly: true,
    });
  }

  const componentSlugSet = new Set(componentDrafts.map((c) => c.slug));
  const componentList = componentDrafts.map((c) => ({ slug: c.slug, name: c.name, secondary: c.fromFileOnly }));

  // conservative "(from prep)" component linking for ingredient lines
  const linkIngredientRefs = (
    lines: ComponentDraft["ingredients"],
    file: string,
    selfSlug?: string,
  ): void => {
    for (const line of lines) {
      if (!line.fromPrep) continue;
      const norm = normalizeName(line.text);
      let matches = componentList.filter((c) => c.slug !== selfSlug && norm.includes(normalizeName(c.name)));
      if (matches.length > 1 && matches.some((m) => !m.secondary)) matches = matches.filter((m) => !m.secondary);
      if (matches.length === 1) {
        line.refComponentSlug = matches[0].slug;
      } else if (matches.length > 1) {
        // prefer the longest matched name if it strictly contains the others
        const longest = matches.reduce((a, b) => (normalizeName(a.name).length >= normalizeName(b.name).length ? a : b));
        const rest = matches.filter((m) => m !== longest);
        if (rest.every((m) => normalizeName(longest.name).includes(normalizeName(m.name)))) {
          line.refComponentSlug = longest.slug;
        } else {
          sink.add(file, 0, `ambiguous "(from prep)" component reference left unlinked: ${truncate(line.text)}`);
        }
      }
    }
  };

  // ---------- meals ----------

  const recipesDir = join(dir, "recipes");
  const recipeFiles = existsSync(recipesDir) ? readdirSync(recipesDir).filter((f) => f.endsWith(".md")) : [];
  const filesByMeal = new Map<number, string[]>();
  for (const f of recipeFiles) {
    const m = f.match(/^m(\d+)-/);
    if (!m) {
      sink.add(`recipes/${f}`, 0, `recipe file does not match m<N>-*.md — skipped`);
      continue;
    }
    const n = Number(m[1]);
    filesByMeal.set(n, [...(filesByMeal.get(n) ?? []), f]);
  }

  const meals: PlanPayloadInput["meals"] = [];
  const mealCount = json.meals.length;

  const clampMeals = (nums: number[], file: string, where: string): number[] => {
    const ok = nums.filter((n) => n >= 1 && n <= mealCount);
    const bad = nums.filter((n) => n < 1 || n > mealCount);
    if (bad.length > 0) sink.add(file, 0, `${where} references meal(s) ${bad.join(",")} outside 1–${mealCount}; dropped`);
    return ok;
  };

  for (const [index, jm] of json.meals.entries()) {
    const mealNumber = Number(jm.id.replace(/^m/, "")) || index + 1;
    const files = filesByMeal.get(mealNumber) ?? [];
    const merge = overrides.mealMerges?.[mealNumber];

    type DocPart = { doc: RecipeDoc; file: string; label?: string };
    const parts: DocPart[] = [];
    if (merge) {
      for (const part of merge) {
        if (!files.includes(part.file)) {
          sink.add(`recipes/${part.file}`, 0, `meal-merge override file missing on disk`);
          continue;
        }
        const md = readFileSync(join(recipesDir, part.file), "utf8");
        parts.push({ doc: parseRecipeDoc(md, `recipes/${part.file}`, sink), file: part.file, label: part.label });
      }
    } else if (files.length > 0) {
      const docs = files.map((f) => ({
        file: f,
        doc: parseRecipeDoc(readFileSync(join(recipesDir, f), "utf8"), `recipes/${f}`, sink),
      }));
      if (docs.length === 1) {
        parts.push(docs[0]);
      } else {
        // stale drafts: keep the file whose H1 best matches the plan.json name
        const scored = docs
          .map((d) => ({ ...d, score: fuzzyScore(d.doc.title ?? d.file, jm.name) }))
          .sort((a, b) => b.score - a.score);
        parts.push(scored[0]);
        for (const discarded of scored.slice(1)) {
          sink.add(
            `recipes/${discarded.file}`,
            0,
            `stale draft discarded (title "${discarded.doc.title ?? "?"}" vs meal "${jm.name}"; kept ${scored[0].file})`,
          );
        }
      }
    } else {
      sink.add("plan.json", 0, `meal ${mealNumber} "${jm.name}" has no recipe file`);
    }

    let proteinCategory = jm.protein_category;
    if (proteinCategory === "vegetarian") {
      proteinCategory = "plant-based";
      sink.add("plan.json", 0, `meal ${mealNumber} protein_category "vegetarian" normalized to "plant-based"`);
    }

    const ingredients: ComponentDraft["ingredients"] = [];
    const steps: ComponentDraft["steps"] = [];
    const preppedIngredients: { text: string; componentSlug?: string }[] = [];
    let yieldLine: string | undefined;
    let attribution: string | undefined;
    let hotTip: string | undefined;
    let servingSuggestion: string | undefined;
    const strayTrailers: string[] = [];

    for (const part of parts) {
      const meta = classifyFolioNotes(part.doc, "meal", `recipes/${part.file}`, sink, jm.subtitle);
      for (const para of part.doc.introParagraphs) {
        sink.add(`recipes/${part.file}`, 0, `intro paragraph on a meal recipe skipped (no schema home): ${truncate(para)}`);
      }
      if (meta.yieldLine) {
        if (yieldLine === undefined) yieldLine = meta.yieldLine;
        else sink.add(`recipes/${part.file}`, 0, `extra yield line dropped in merge: ${truncate(meta.yieldLine)}`);
      }
      attribution = attribution ?? meta.attribution;
      const withLabel = (section: string | undefined): string | undefined => {
        if (!part.label) return section;
        return section ? `${part.label} — ${section}` : part.label;
      };
      for (const line of part.doc.ingredients) ingredients.push({ ...line, section: withLabel(line.section) });
      for (const step of part.doc.steps) steps.push({ ...step, section: withLabel(step.section) });
      for (const p of part.doc.preppedIngredients) {
        let componentSlug = p.componentRef ? (fileAliases[p.componentRef] ?? p.componentRef) : undefined;
        if (componentSlug && !componentSlugSet.has(componentSlug)) {
          sink.add(`recipes/${part.file}`, 0, `prepped ingredient references unknown component "${componentSlug}"; unlinked`);
          componentSlug = undefined;
        }
        preppedIngredients.push({ text: p.text, componentSlug });
      }
      if (part.doc.hotTip) {
        const tip = part.label ? `${part.label} — ${part.doc.hotTip}` : part.doc.hotTip;
        hotTip = hotTip ? `${hotTip}\n\n${tip}` : tip;
      }
      if (part.doc.servingSuggestion) {
        const s = part.label ? `${part.label} — ${part.doc.servingSuggestion}` : part.doc.servingSuggestion;
        servingSuggestion = servingSuggestion ? `${servingSuggestion}\n\n${s}` : s;
      }
      if (part.doc.storageNote) {
        sink.add(`recipes/${part.file}`, 0, `**To Store:** on a meal recipe appended to last-step footnote`);
        strayTrailers.push(`**To Store:** ${part.doc.storageNote}`);
      }
      strayTrailers.push(...part.doc.strayTrailers, ...part.doc.extraNotes.map((n) => `**Note:** ${n}`));
    }

    // meal trailers with no schema field → footnote on the final step
    if (strayTrailers.length > 0 && steps.length > 0) {
      const last = steps[steps.length - 1];
      const extra = strayTrailers.join("\n\n");
      last.footnote = last.footnote ? `${last.footnote}\n\n${extra}` : extra;
    }

    linkIngredientRefs(ingredients, parts.map((p) => `recipes/${p.file}`).join("+"));

    const componentSlugs = (jm.components ?? []).filter((s) => {
      if (componentSlugSet.has(s)) return true;
      sink.add("plan.json", 0, `meal ${mealNumber} lists unknown component "${s}"; dropped`);
      return false;
    });

    meals.push({
      mealNumber,
      name: jm.name,
      subtitle: jm.subtitle,
      protein: jm.protein,
      proteinCategory,
      cuisine: jm.cuisine,
      keyIngredients: jm.key_ingredients ?? [],
      prepTimeMinutes: jm.prep_time_minutes,
      cookTimeMinutes: jm.cook_time_minutes,
      yieldLine,
      attribution,
      componentSlugs,
      preppedIngredients,
      ingredients,
      steps,
      hotTip,
      servingSuggestion,
    });
  }

  for (const draft of componentDrafts) {
    linkIngredientRefs(draft.ingredients, `components/${cardFileForSlug.get(draft.slug) ?? draft.slug}`, draft.slug);
  }

  // ---------- menu ----------

  const theme = json.theme ?? slug.slice(11);
  const menu = parseMenu(
    readFileSync(join(dir, "menu.md"), "utf8"),
    "menu.md",
    theme,
    meals.map((m) => ({ mealNumber: m.mealNumber, name: m.name })),
    sink,
  );
  for (const meal of meals) {
    const blurb = menu.blurbs.get(meal.mealNumber);
    if (blurb) meal.menuBlurb = blurb;
    else sink.add("menu.md", 0, `no menu blurb matched meal ${meal.mealNumber} "${meal.name}"`);
  }

  // ---------- grocery / essentials ----------

  const groceryItems = parseGrocery(readFileSync(join(dir, "grocery-list.md"), "utf8"), "grocery-list.md", sink);
  crossCheckGrocery(json.grocery, groceryItems, "grocery-list.md", sink);
  const grocery: PlanPayloadInput["grocery"] = groceryItems.map((g) => ({
    category: g.category as PlanPayloadInput["grocery"][number]["category"],
    isOptional: g.isOptional,
    name: g.name,
    quantityText: g.quantityText,
    grams: g.grams,
    note: g.note,
    mealNumbers: clampMeals(g.mealNumbers, "grocery-list.md", `grocery "${g.name}"`),
  }));

  const essentialsDoc = parseEssentials(readFileSync(join(dir, "essentials.md"), "utf8"), "essentials.md", sink);
  const essentials: PlanPayloadInput["essentials"] = essentialsDoc.essentials.map((e) => ({
    group: e.group as NonNullable<PlanPayloadInput["essentials"]>[number]["group"],
    name: e.name,
    note: e.note,
    mealNumbers: clampMeals(e.mealNumbers, "essentials.md", `essential "${e.name}"`),
  }));
  const timeSavers: PlanPayloadInput["timeSavers"] = essentialsDoc.timeSavers.map((s) => ({
    storeSection: s.storeSection,
    name: s.name,
    note: s.note,
    replaces: s.replaces,
  }));

  // ---------- prep list ----------

  const prepCtx: PrepContext = {
    components: componentList,
    componentFileAliases: fileAliases,
    destinationAliases: Object.fromEntries(
      Object.entries(overrides.destinationAliases ?? {}).map(([k, v]) => [normalizeName(k), v]),
    ),
  };
  const prepMd = readFileSync(join(dir, "prep-list.md"), "utf8");
  const prepFolio = extractFolio(prepMd);
  const prepSectionsRaw = parsePrep(prepFolio.body, prepFolio.bodyStartLine, "prep-list.md", prepCtx, sink);
  const prepSections: PlanPayloadInput["prepSections"] = prepSectionsRaw.map((s) => ({
    kind: s.kind,
    title: s.title,
    timeEstimate: s.timeEstimate,
    tasks: s.tasks.map((t) => ({
      taskType: t.taskType,
      title: t.title,
      quantityText: t.quantityText,
      componentSlug: t.componentSlug,
      stepRangeText: t.stepRangeText,
      body: t.body,
      mealNumbers: clampMeals(t.mealNumbers, "prep-list.md", `prep task "${t.title}"`),
      allocations: t.allocations.map((a) => ({
        quantityText: a.quantityText,
        prepText: a.prepText,
        destination: a.destination,
        sundayConsumed: a.sundayConsumed,
        mealNumbers: clampMeals(a.mealNumbers, "prep-list.md", `allocation under "${t.title}"`),
      })),
    })),
  }));

  // ---------- orphan pruning (fileOnly components nothing references) ----------

  const referenced = new Set<string>();
  for (const meal of meals) {
    for (const s of meal.componentSlugs ?? []) referenced.add(s);
    for (const p of meal.preppedIngredients ?? []) if (p.componentSlug) referenced.add(p.componentSlug);
    for (const l of meal.ingredients) if (l.refComponentSlug) referenced.add(l.refComponentSlug);
  }
  for (const c of componentDrafts) {
    for (const l of c.ingredients) if (l.refComponentSlug) referenced.add(l.refComponentSlug);
  }
  for (const s of prepSections ?? []) {
    for (const t of s.tasks ?? []) {
      if (t.componentSlug) referenced.add(t.componentSlug);
      for (const a of t.allocations ?? []) {
        if (a.destination.kind === "component") referenced.add(a.destination.componentSlug);
      }
    }
  }

  const components: PlanPayloadInput["components"] = [];
  for (const draft of componentDrafts) {
    if (draft.fromFileOnly && !referenced.has(draft.slug)) {
      sink.add(
        `components/${cardFileForSlug.get(draft.slug) ?? `${draft.slug}.md`}`,
        0,
        `orphan component file "${draft.slug}" discarded (nothing in the plan references it — stale draft)`,
      );
      continue;
    }
    components.push({
      slug: draft.slug,
      name: draft.name,
      type: draft.type,
      yieldText: draft.yieldText,
      intro: draft.intro,
      attribution: draft.attribution,
      storageNote: draft.storageNote,
      hotTip: draft.hotTip,
      notes: draft.notes,
      ingredients: draft.ingredients,
      steps: draft.steps,
    });
  }

  const payload: PlanPayloadInput = {
    slug,
    weekOf,
    theme,
    servings: json.servings ?? 2,
    leftovers: json.leftovers ?? false,
    difficulty,
    generatedAt,
    menuNote: menu.menuNote,
    metadata,
    meals,
    components,
    grocery,
    essentials,
    timeSavers,
    prepSections,
  };

  return { slug, payload, flags };
}
