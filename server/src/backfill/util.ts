// Shared helpers for the backfill parsers: superscript meal markers, name
// normalization/fuzzy matching, and the flag report shape.

export type Flag = {
  file: string;
  line: number; // 1-based line in the source file (0 = file-level)
  reason: string;
};

export type FlagSink = {
  add: (file: string, line: number, reason: string) => void;
};

export function makeFlagSink(flags: Flag[]): FlagSink {
  return {
    add(file, line, reason) {
      flags.push({ file, line, reason });
    },
  };
}

const SUPERSCRIPTS: Record<string, number> = {
  "¹": 1,
  "²": 2,
  "³": 3,
  "⁴": 4,
  "⁵": 5,
  "⁶": 6,
  "⁷": 7,
  "⁸": 8,
  "⁹": 9,
};

export const SUPERSCRIPT_RE = /[¹²³⁴⁵⁶⁷⁸⁹]/g;

// Strip superscript meal markers (anywhere in the line) and the 🫙 flag.
// Returns the cleaned text plus what was found.
export function stripMarkers(input: string): { text: string; mealNumbers: number[]; jar: boolean } {
  const mealNumbers: number[] = [];
  for (const ch of input.match(SUPERSCRIPT_RE) ?? []) {
    const n = SUPERSCRIPTS[ch];
    if (!mealNumbers.includes(n)) mealNumbers.push(n);
  }
  const jar = input.includes("🫙");
  const text = input
    .replace(SUPERSCRIPT_RE, "")
    .replace(/🫙/g, "")
    .replace(/[ \t]+$/g, "")
    .replace(/[ \t]{2,}/g, " ");
  mealNumbers.sort((a, b) => a - b);
  return { text, mealNumbers, jar };
}

// Lowercase, fold diacritics (Ají → aji, Đồ → do), drop punctuation/markdown.
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[*_`~]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  const n = normalizeName(s);
  return n === "" ? [] : n.split(" ");
}

// Similarity in [0,1]: exact normalized match = 1, containment = 0.9,
// otherwise token Jaccard.
export function fuzzyScore(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === "" || nb === "") return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const union = ta.size + tb.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

// Split on a separator, ignoring separators inside (), [], and "quotes".
export function splitTopLevel(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    else if (ch === '"' || ch === "“") inQuote = true;
    else if (ch === "”") inQuote = false;
    else if (ch === '"' && inQuote) inQuote = false;
    if (ch === sep && depth === 0 && !inQuote) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

// Find the first "(" and its balanced ")"; returns before/inside/after.
export function splitParenthetical(text: string): { before: string; inside?: string; after: string } {
  const open = text.indexOf("(");
  if (open < 0) return { before: text.trim(), after: "" };
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) {
        return {
          before: text.slice(0, open).trim(),
          inside: text.slice(open + 1, i).trim(),
          after: text.slice(i + 1).trim(),
        };
      }
    }
  }
  return { before: text.trim(), after: "" }; // unbalanced — treat as plain text
}

// Best-effort grams from a quantity string: last "NNN g" / "N.N kg" mention.
export function parseGrams(quantity: string): number | undefined {
  let grams: number | undefined;
  const re = /(?:^|[\s/(~])(\d+(?:[.,]\d+)?)\s*(g|kg)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(quantity)) !== null) {
    const value = Number(m[1].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    grams = m[2] === "kg" ? value * 1000 : value;
  }
  return grams;
}

// Strip a single layer of _italics_ or **bold** wrapping.
export function unwrapEmphasis(s: string): string {
  let out = s.trim();
  for (const [open, close] of [
    ["**", "**"],
    ["_", "_"],
  ]) {
    if (out.startsWith(open) && out.endsWith(close) && out.length > open.length + close.length) {
      out = out.slice(open.length, -close.length).trim();
    }
  }
  return out;
}

export function truncate(s: string, n = 70): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= n ? flat : `${flat.slice(0, n - 1)}…`;
}
