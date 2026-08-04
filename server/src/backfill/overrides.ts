// Hardcoded per-plan anomalies discovered while auditing the 15 legacy plan
// folders. Everything here is data the generic parsers cannot infer safely.

export type MealMergePart = {
  file: string; // recipe file basename
  label: string; // section prefix for merged ingredient/step sections
};

export type PlanOverrides = {
  // component md file basename → the plan.json component id it documents
  // (used when the file was renamed after plan.json was written)
  componentFileAliases?: Record<string, string>;
  // normalized destination/prep-reference text → component slug, for
  // prep-list destinations that name a component too loosely to fuzzy-match
  destinationAliases?: Record<string, string>;
  // meals whose multiple recipe files merge into one meal (dish labels
  // prefix each file's ingredient/step sections)
  mealMerges?: Record<number, MealMergePart[]>;
};

export const OVERRIDES: Record<string, PlanOverrides> = {
  // plan.json id "miso-glaze" (name "Miso-Mirin Glaze") is documented by
  // components/miso-mirin-glaze.md — the file was renamed after plan.json.
  "2026-02-03-asian-comfort": {
    componentFileAliases: { "miso-mirin-glaze": "miso-glaze" },
  },

  // m3 is one meal served two ways: tri-tip (6 plates) + salmon (2 plates).
  // Merge both recipe files into meal 3 with dish-labeled sections.
  "2026-06-29-california-summer-table": {
    mealMerges: {
      3: [
        { file: "m3-santa-maria-tri-tip.md", label: "Tri-Tip" },
        { file: "m3-salmon-salsa-verde.md", label: "Salmon" },
      ],
    },
  },

  // Prep destinations that name components by their working titles.
  "2026-07-20-peruvian-summer": {
    destinationAliases: {
      "beef shank seco de res": "slow-cooker-seco-de-res",
      "yogurt aji verde": "aji-verde",
    },
  },
  "2026-07-20-summer-smokehouse": {
    destinationAliases: {
      "brisket braise": "oven-smoked-brisket",
    },
  },
  "2026-07-27-peak-summer-italian": {
    destinationAliases: {
      "chicken broth": "rotisserie-chicken-broth",
      "minestrone base": "minestrone-base",
    },
  },
};

export function overridesFor(slug: string): PlanOverrides {
  return OVERRIDES[slug] ?? {};
}
