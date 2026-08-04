/** Group consecutive lines that share a section heading, preserving order. */
export function groupBySection<T extends { section?: string }>(lines: T[]): { section?: string; items: T[] }[] {
  const groups: { section?: string; items: T[] }[] = [];
  for (const line of lines) {
    const current = groups[groups.length - 1];
    if (current && current.section === line.section) {
      current.items.push(line);
    } else {
      groups.push({ section: line.section, items: [line] });
    }
  }
  return groups;
}

/** Strip a stored bold lead-in like "**Hot Tip:**" — the view supplies its own label. */
export function stripLeadIn(text: string, label: string): string {
  const pattern = new RegExp(`^\\s*(?:>\\s*)?\\*\\*${label}:?\\*\\*:?\\s*`, "i");
  return text.replace(pattern, "");
}
