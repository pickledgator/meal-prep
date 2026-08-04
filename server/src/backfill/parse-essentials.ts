// essentials.md → essential items (fats / spices_aromatics / other / tools)
// and time savers (### store-section groups with ~~strikethrough~~ replaces).

import { extractFolio } from "./parse-folio.js";
import { stripMarkers, truncate, type FlagSink } from "./util.js";

export type ParsedEssential = {
  group: string;
  name: string;
  note?: string;
  mealNumbers: number[];
};

export type ParsedTimeSaver = {
  storeSection: string;
  name: string;
  note?: string;
  replaces: string[];
};

const GROUP_MAP: Record<string, string> = {
  "fats": "fats",
  "spices & aromatics": "spices_aromatics",
  "spices and aromatics": "spices_aromatics",
  "other": "other",
};

type Mode =
  | { kind: "essentials"; group?: string }
  | { kind: "tools" }
  | { kind: "timesavers"; section?: string }
  | { kind: "key" };

export function parseEssentials(
  markdown: string,
  file: string,
  flags: FlagSink,
): { essentials: ParsedEssential[]; timeSavers: ParsedTimeSaver[] } {
  const folio = extractFolio(markdown);
  const essentials: ParsedEssential[] = [];
  const timeSavers: ParsedTimeSaver[] = [];
  const lines = folio.body.split("\n");
  let mode: Mode = { kind: "key" };
  let lastEssential: ParsedEssential | undefined;
  let lastSaver: ParsedTimeSaver | undefined;

  const appendNote = (target: { note?: string }, note: string) => {
    target.note = target.note ? `${target.note}; ${note}` : note;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const lineNo = folio.bodyStartLine + i;
    if (line === "" || line === "---") continue;

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2 && !line.startsWith("###")) {
      const key = h2[1].trim().replace(/:$/, "").toLowerCase();
      if (key === "essentials") mode = { kind: "essentials" };
      else if (key === "tools") mode = { kind: "tools" };
      else if (key === "time savers") mode = { kind: "timesavers" };
      else {
        mode = { kind: "key" };
        flags.add(file, lineNo, `unknown essentials heading "## ${h2[1].trim()}" skipped`);
      }
      lastEssential = undefined;
      lastSaver = undefined;
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const title = h3[1].trim().replace(/:$/, "");
      if (mode.kind === "essentials") {
        const group = GROUP_MAP[title.toLowerCase()];
        if (group) {
          mode = { kind: "essentials", group };
        } else {
          mode = { kind: "essentials", group: "other" };
          flags.add(file, lineNo, `unknown essentials group "### ${title}" mapped to "other"`);
        }
      } else if (mode.kind === "timesavers") {
        mode = { kind: "timesavers", section: title };
      } else {
        flags.add(file, lineNo, `unexpected subheading "### ${title}" skipped`);
      }
      lastEssential = undefined;
      lastSaver = undefined;
      continue;
    }

    if (line.startsWith("**KEY**")) {
      mode = { kind: "key" };
      continue;
    }
    if (mode.kind === "key") continue;
    if (/^_.+_$/.test(line)) continue; // "_Assume you have these on hand_" boilerplate

    const indented = /^\s+-\s+/.test(raw);
    const item = line.match(/^-\s+(.*)$/);
    if (!item) {
      flags.add(file, lineNo, `unparsed essentials line skipped: ${truncate(line)}`);
      continue;
    }
    const content = item[1].trim();

    if (mode.kind === "essentials" || mode.kind === "tools") {
      if (indented) {
        if (lastEssential) appendNote(lastEssential, content.replace(/^\(|\)$/g, ""));
        else flags.add(file, lineNo, `orphan sub-note skipped: ${truncate(content)}`);
        continue;
      }
      const group = mode.kind === "tools" ? "tools" : mode.group;
      if (!group) {
        flags.add(file, lineNo, `essentials item before any group skipped: ${truncate(content)}`);
        continue;
      }
      // note = parenthetical that FOLLOWS the superscripts; leading/inline
      // parentheticals stay in the name.
      const m = content.match(/^(.*?[¹²³⁴⁵⁶⁷⁸⁹])\s*\((.+)\)\s*$/);
      let body = content;
      let note: string | undefined;
      if (m) {
        body = m[1];
        note = m[2].trim();
      }
      const { text, mealNumbers } = stripMarkers(body);
      lastEssential = { group, name: text.trim(), note, mealNumbers };
      essentials.push(lastEssential);
      continue;
    }

    if (mode.kind === "timesavers") {
      if (indented) {
        if (!lastSaver) {
          flags.add(file, lineNo, `orphan time-saver sub-line skipped: ${truncate(content)}`);
          continue;
        }
        const struck = content.match(/^~~(.+)~~$/);
        if (struck) lastSaver.replaces.push(struck[1].trim());
        else appendNote(lastSaver, content);
        continue;
      }
      if (!mode.section) {
        flags.add(file, lineNo, `time saver before any store section skipped: ${truncate(content)}`);
        continue;
      }
      const { text, mealNumbers } = stripMarkers(content);
      void mealNumbers; // time savers carry no meal refs in the schema
      lastSaver = { storeSection: mode.section, name: text.trim(), replaces: [] };
      timeSavers.push(lastSaver);
      continue;
    }
  }

  return { essentials, timeSavers };
}
