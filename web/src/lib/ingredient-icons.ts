// Ingredient → emoji marks, extracted from the old markdown renderer as pure
// string functions. Fed clean item names now, but the boundary trimming is kept
// so prep-task titles like "Garlic — 17 cloves" still resolve on the name.

const ingredientIcons: [RegExp, string][] = [
  // Proteins
  [/\b(salmon|fish|cod|halibut|tilapia|trout|tuna|mahi)s?\b/i, "🐟"],
  [/\b(shrimp|prawns?|scallops?|lobsters?|crabs?|shellfish)\b/i, "🦐"],
  [/\b(chicken|poultry)\b/i, "🍗"],
  [/\b(turkey)\b/i, "🦃"],
  [/\b(beef|steaks?|brisket|sirloin)\b/i, "🥩"],
  [/\b(lamb)\b/i, "🐑"],
  [/\b(pork|bacon|ham)\b/i, "🥓"],
  [/\beggs?\b/i, "🥚"],
  [/\b(tofu|tempeh)\b/i, "🧈"],
  [/\bsausages?\b/i, "🌭"],

  // Seasonings that would otherwise be caught by produce patterns below
  [/\b(black pepper|peppercorns?|freshly ground pepper)\b/i, "🧂"],
  [/\b(avocado oil|olive oil)\b/i, "🫗"],

  // Vegetables
  [/\bgarlic\b/i, "🧄"],
  [/\b(onions?|shallots?|scallions?|leeks?)\b/i, "🧅"],
  [/\b(tomato|tomatoes)\b/i, "🍅"],
  [/\b(potatoes?|russets?)\b/i, "🥔"],
  [/\bcarrots?\b/i, "🥕"],
  [/\b(broccoli|broccolini)\b/i, "🥦"],
  [/\b(lettuce|arugula|spinach|greens)\b/i, "🥬"],
  [/\b(kale|chard)\b/i, "🥬"],
  [/\bcorn\b/i, "🌽"],
  [/\b(peppers?|bell peppers?|jalapeños?)\b/i, "🫑"],
  [/\b(hot peppers?|chili|chile|chilies)\b/i, "🌶️"],
  [/\bcucumbers?\b/i, "🥒"],
  [/\b(zucchini|squash)\b/i, "🥒"],
  [/\b(eggplants?|aubergines?)\b/i, "🍆"],
  [/\bmushrooms?\b/i, "🍄"],
  [/\bavocados?\b/i, "🥑"],
  [/\b(cabbage|brussels sprouts?|slaw)\b/i, "🥬"],
  [/\bcelery\b/i, "🥬"],
  [/\basparagus\b/i, "🥬"],
  [/\b(peas?|snap peas?|snow peas?)\b/i, "🫛"],
  [/\b(beans?|green beans?)\b/i, "🫘"],
  [/\bfennel\b/i, "🌿"],
  [/\bradish(es)?\b/i, "🌶️"],
  [/\bartichokes?\b/i, "🥬"],
  [/\bcauliflower\b/i, "🥦"],

  // Fruits
  [/\blemons?\b/i, "🍋"],
  [/\blimes?\b/i, "🍋‍🟩"],
  [/\b(oranges?|citrus|blood oranges?)\b/i, "🍊"],
  [/\bapples?\b/i, "🍎"],
  [/\bbananas?\b/i, "🍌"],
  [/\bgrapes?\b/i, "🍇"],
  [/\bstrawberr(y|ies)\b/i, "🍓"],
  [/\b(blueberr(y|ies)|berr(y|ies))\b/i, "🫐"],
  [/\b(peach(es)?|nectarines?)\b/i, "🍑"],
  [/\bpears?\b/i, "🍐"],
  [/\bmango(es|s)?\b/i, "🥭"],
  [/\bpineapples?\b/i, "🍍"],
  [/\b(watermelons?|melons?)\b/i, "🍉"],
  [/\bcoconuts?\b/i, "🥥"],
  [/\bolives?\b/i, "🫒"],

  // Dairy
  [/\b(milk)\b/i, "🥛"],
  [/\b(cheese|parmesan|parmigiano|feta|cheddar|mozzarella|gouda|halloumi)\b/i, "🧀"],
  [/\b(butter)\b/i, "🧈"],
  [/\b(yogurt)\b/i, "🥛"],
  [/\b(cream)\b/i, "🥛"],

  // Grains & Bread
  [/\b(rice|farro|quinoa|grain|orzo|couscous|polenta|bulgur)\b/i, "🍚"],
  [/\b(pasta|spaghetti|penne|tagliatelle|linguine|noodles?|gnocchi|orecchiette)\b/i, "🍝"],
  [/\b(bread|baguette|ciabatta|focaccia|flatbread|pita|sourdough)\b/i, "🍞"],
  [/\b(flour|wheat)\b/i, "🌾"],
  [/\b(oat)\b/i, "🌾"],

  // Herbs & Spices
  [/\b(herb|parsley|cilantro|basil|dill|mint|thyme|rosemary|oregano|sage|chive)\b/i, "🌿"],
  [/\b(ginger)\b/i, "🫚"],
  [/\b(spice|cumin|paprika|cinnamon|turmeric|coriander)\b/i, "🧂"],
  [/\b(salt|pepper|seasoning)\b/i, "🧂"],

  // Pantry
  [/\bolive oil\b/i, "🫒"],
  [/\b(sesame oil|neutral oil|vegetable oil|canola oil|avocado oil|oil)\b/i, "🫗"],
  [/\b(vinegar)\b/i, "🍶"],
  [/\b(honey)\b/i, "🍯"],
  [/\b(sugar)\b/i, "🍬"],
  [/\b(sauce|soy sauce|fish sauce|pesto)\b/i, "🥫"],
  [/\b(stock|broth|bouillon)\b/i, "🥣"],
  [/\b(tahini)\b/i, "🥜"],
  [/\b(nut|almond|walnut|pecan|peanut|cashew|pine nuts?)\b/i, "🥜"],
  [/\b(harissa|gochujang|sriracha|hot sauce)\b/i, "🌶️"],
  [/\b(mustard)\b/i, "🟡"],
  [/\b(mayo|mayonnaise)\b/i, "🥚"],
  [/\b(ketchup)\b/i, "🍅"],
  [/\b(can|canned|crushed tomato)\b/i, "🥫"],
  [/\b(panko|breadcrumb)\b/i, "🍞"],
];

// Limit icon inference to the item header. Allocation destinations may mention
// unrelated foods (a garlic allocation destined for "Chicken Marinade"); those
// words must not override the actual ingredient at the start of the line.
function getIconSubject(text: string): string {
  const normalized = text.trim();
  const boundaries = ["—", "(", ";", "→", "\n"]
    .map((marker) => normalized.indexOf(marker))
    .filter((index) => index >= 0);

  if (boundaries.length === 0) return normalized;
  return normalized.slice(0, Math.min(...boundaries)).trim();
}

function matchIcon(subject: string): string | null {
  for (const [pattern, icon] of ingredientIcons) {
    if (pattern.test(subject)) {
      return icon;
    }
  }
  return null;
}

// Find an icon for the ingredient named in the item's own header. When the
// header alone yields nothing — recipe lines lead with a quantity, as in
// "1 lb (454 g) Brussels Sprouts" — widen to everything before the first
// arrow, which is the only part that can name another component.
export function getIngredientIcon(text: string): string | null {
  const subject = getIconSubject(text);
  if (subject) {
    const fromSubject = matchIcon(subject);
    if (fromSubject) return fromSubject;
  }

  const beforeDestination = text.split("→")[0].trim();
  if (!beforeDestination || beforeDestination === subject) return null;

  return matchIcon(beforeDestination);
}
