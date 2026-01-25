// TypeScript types derived from plan.json schema

export interface Meal {
  id: string;
  name: string;
  subtitle: string;
  protein: string;
  protein_category: "seafood" | "poultry" | "red meat" | "vegetarian";
  cuisine: string;
  components: string[];
  key_ingredients: string[];
  prep_time_minutes: number;
  cook_time_minutes: number;
}

export interface Component {
  id: string;
  name: string;
  type: "sauce" | "glaze" | "grain" | "marinade" | "relish" | "dressing" | "base";
  yield: string;
  used_in: string[];
}

export interface GroceryItem {
  item: string;
  quantity: string;
  meals: string[];
}

export interface Grocery {
  produce: GroceryItem[];
  proteins: GroceryItem[];
  dairy_eggs: GroceryItem[];
  shelf_stable: GroceryItem[];
}

export interface Plan {
  week_of: string;
  folder_name: string;
  generated_at: string;
  servings: number;
  leftovers: boolean;
  theme: string;
  difficulty: "easy" | "normal" | "challenging";
  meals: Meal[];
  components: Component[];
  grocery: Grocery;
}

// Summary type for plan listing
export interface PlanSummary {
  folder_name: string;
  week_of: string;
  theme: string;
  servings: number;
  meal_count: number;
  difficulty: string;
  generated_at: string;
}

// Generation job types
export interface GenerateParams {
  meals: number;
  servings: number;
  theme?: string;
  proteins?: string;
  mustUse?: string;
  difficulty: "easy" | "normal" | "challenging";
  leftovers: boolean;
}

export interface GenerateJob {
  id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  params: GenerateParams;
  output: string[];
  createdAt: string;
  completedAt?: string;
  resultFolder?: string;
  error?: string;
}

// Markdown file types
export type MarkdownFileType = "menu" | "grocery-list" | "prep-list" | "essentials";
