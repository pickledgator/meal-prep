// Pull the title block off a plan markdown file so the page chrome can set it
// in the folio header instead of repeating it inside the body copy.

const H1 = /^#\s+(.+)$/;
const EMPHASIS = /^_(.+)_$/;

export interface Folio {
  /** The document's `# Heading`, if it leads the file. */
  title?: string;
  /** The italic lines that follow it — subtitle, yield, attribution. */
  notes: string[];
  /** Everything after the title block, with a leading `---` removed. */
  body: string;
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
    return { notes: [], body: markdown };
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

  return { title, notes, body: lines.slice(cursor).join("\n").trimStart() };
}
