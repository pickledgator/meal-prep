// Shared formatting for dates, counts, and plan metadata.

/** Parse a `YYYY-MM-DD` week key at local midnight (never UTC-shifted). */
function parseWeek(weekOf: string): Date {
  return new Date(`${weekOf}T00:00:00`);
}

/** "July 27, 2026" */
export function formatWeek(weekOf: string): string {
  return parseWeek(weekOf).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "Jul 27" — for dense index rows */
export function formatWeekShort(weekOf: string): string {
  return parseWeek(weekOf).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "2026" */
export function formatWeekYear(weekOf: string): string {
  return String(parseWeek(weekOf).getFullYear());
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen",
];

const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty",
  "ninety",
];

/** Spell small numbers so headlines can read as sentences. Falls back to digits. */
export function spellNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = n % 10;
  return ones === 0 ? tens : `${tens}-${ONES[ones]}`;
}

export function sentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Category → the swatch color token used for its mark. */
export function categoryColor(category: string): string {
  switch (category) {
    case "seafood":
      return "text-cat-seafood";
    case "poultry":
      return "text-cat-poultry";
    case "red meat":
      return "text-cat-meat";
    case "plant-based":
    case "vegetarian": // legacy plans
      return "text-cat-veg";
    default:
      return "text-ink-faint";
  }
}

/** Superscript digits for meal references: [1,3] → "¹³" */
const SUPERSCRIPTS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
export function mealSuperscripts(mealNumbers: number[]): string {
  return mealNumbers.map((n) => SUPERSCRIPTS[n] ?? String(n)).join("");
}
