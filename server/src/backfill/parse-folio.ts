// Port of web/src/lib/markdown.ts extractFolio: pull the `# Title` plus the
// italic note lines off the top of a plan markdown file. `bodyStartLine` is
// the 1-based line number where the body begins (for flag reporting).

const H1 = /^#\s+(.+)$/;
const EMPHASIS = /^_(.+)_$/;

export interface Folio {
  title?: string;
  notes: string[];
  body: string;
  bodyStartLine: number;
}

export function extractFolio(markdown: string): Folio {
  const lines = markdown.split("\n");
  let cursor = 0;

  const skipBlank = () => {
    while (cursor < lines.length && lines[cursor].trim() === "") cursor++;
  };

  skipBlank();

  const heading = lines[cursor]?.match(H1);
  if (!heading) {
    return { notes: [], body: markdown, bodyStartLine: 1 };
  }

  const title = heading[1].trim();
  cursor++;

  const notes: string[] = [];
  while (notes.length < 3) {
    const checkpoint = cursor;
    skipBlank();
    const emphasis = lines[cursor]?.trim().match(EMPHASIS);
    if (!emphasis) {
      cursor = checkpoint;
      break;
    }
    notes.push(emphasis[1].trim());
    cursor++;
  }

  skipBlank();
  if (lines[cursor]?.trim() === "---") cursor++;

  return { title, notes, body: lines.slice(cursor).join("\n"), bodyStartLine: cursor + 1 };
}
