// menu.md → menuNote (header italic suffix) + per-meal menuBlurb (the
// lowercase comma line under each bold dish name). Blocks are matched to
// plan.json meals by fuzzy name match against the bold dish names and any
// `## Course` heading; unmatched blocks are flagged.

import { extractFolio } from "./parse-folio.js";
import { fuzzyScore, normalizeName, truncate, unwrapEmphasis, type FlagSink } from "./util.js";

export type MenuResult = {
  menuNote?: string;
  blurbs: Map<number, string>;
};

type Dish = { name: string; blurb: string[] };

export function parseMenu(
  markdown: string,
  file: string,
  theme: string,
  meals: { mealNumber: number; name: string }[],
  flags: FlagSink,
): MenuResult {
  const folio = extractFolio(markdown);
  const result: MenuResult = { blurbs: new Map() };

  for (const note of folio.notes) {
    const dash = note.indexOf(" — ");
    if (dash >= 0) {
      const before = note.slice(0, dash).trim();
      const after = note.slice(dash + 3).trim();
      const boilerplate = /^week of\b/i.test(before) || normalizeName(before) === normalizeName(theme);
      if (boilerplate && after !== "" && result.menuNote === undefined) {
        result.menuNote = after;
        continue;
      }
    }
    if (/^week of\b/i.test(note) || /^theme:/i.test(note)) continue; // derivable boilerplate
    flags.add(file, 0, `menu folio note skipped: ${truncate(note)}`);
  }

  // split body into blocks on standalone "---"
  const lines = folio.body.split("\n");
  type Block = { start: number; lines: string[] };
  const blocks: Block[] = [];
  let current: Block | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "---") {
      current = undefined;
      continue;
    }
    if (line === "") continue;
    if (!current) {
      current = { start: folio.bodyStartLine + i, lines: [] };
      blocks.push(current);
    }
    current.lines.push(lines[i]);
  }

  for (const block of blocks) {
    let heading: string | undefined;
    const dishes: Dish[] = [];
    let currentDish: Dish | undefined;
    let onlyItalics = true;

    for (const raw of block.lines) {
      const line = raw.trim();
      const h = line.match(/^#{2,3}\s+(.+)$/);
      if (h) {
        heading = h[1].replace(/^\p{Extended_Pictographic}\s*/u, "").trim();
        onlyItalics = false;
        continue;
      }
      const bold = line.match(/^\*\*(.+?)\*\*(.*)$/);
      if (bold) {
        currentDish = { name: bold[1].trim(), blurb: [] };
        dishes.push(currentDish);
        onlyItalics = false;
        continue;
      }
      if (/^_.+_$/.test(line)) continue; // subtitle italics — plan.json subtitle wins
      onlyItalics = false;
      if (currentDish) currentDish.blurb.push(line);
      else if (heading !== undefined) {
        // stray prose under a heading with no dish yet
        flags.add(file, block.start, `menu prose without a dish skipped: ${truncate(line)}`);
      }
    }

    if (dishes.length === 0 && heading === undefined) {
      if (!onlyItalics || block.lines.length > 0) {
        flags.add(file, block.start, `menu block matched no dish/heading: ${truncate(block.lines.join(" "))}`);
      }
      continue;
    }

    // fuzzy match block → meal
    let best: { meal: (typeof meals)[number]; score: number } | undefined;
    for (const meal of meals) {
      const candidates = [...dishes.map((d) => d.name), ...(heading ? [heading] : [])];
      const score = Math.max(...candidates.map((c) => fuzzyScore(c, meal.name)), 0);
      if (!best || score > best.score) best = { meal, score };
    }
    if (!best || best.score < 0.45) {
      flags.add(file, block.start, `menu block "${truncate(dishes[0]?.name ?? heading ?? "")}" matched no meal`);
      continue;
    }
    if (result.blurbs.has(best.meal.mealNumber)) {
      flags.add(file, block.start, `menu block "${truncate(dishes[0]?.name ?? heading ?? "")}" — meal ${best.meal.mealNumber} already matched; skipped`);
      continue;
    }

    const parts = dishes
      .map((d) => ({ name: unwrapEmphasis(d.name), blurb: d.blurb.join(" ").trim() }))
      .filter((d) => d.blurb !== "");
    let blurb: string;
    if (parts.length === 1) blurb = parts[0].blurb;
    else blurb = parts.map((d) => `${d.name}: ${d.blurb}`).join(" · ");
    if (blurb !== "") result.blurbs.set(best.meal.mealNumber, blurb);
  }

  return result;
}
