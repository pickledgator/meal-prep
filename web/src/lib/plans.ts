import { promises as fs } from "fs";
import path from "path";
import type { Plan, PlanSummary } from "./types";

// Plans directory relative to the project root (one level up from web/)
const PLANS_DIR = path.join(process.cwd(), "..", "plans");

/**
 * Get the absolute path to the plans directory
 */
export function getPlansDirectory(): string {
  return PLANS_DIR;
}

/**
 * List all plan folders in the plans directory
 */
export async function listPlanFolders(): Promise<string[]> {
  try {
    const entries = await fs.readdir(PLANS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort()
      .reverse(); // Newest first
  } catch {
    console.error("Failed to read plans directory:", PLANS_DIR);
    return [];
  }
}

/**
 * Read a plan.json file from a plan folder
 */
export async function getPlan(slug: string): Promise<Plan | null> {
  try {
    const planPath = path.join(PLANS_DIR, slug, "plan.json");
    const content = await fs.readFile(planPath, "utf-8");
    return JSON.parse(content) as Plan;
  } catch {
    console.error(`Failed to read plan: ${slug}`);
    return null;
  }
}

/**
 * Get a summary of all plans for listing
 */
export async function getAllPlanSummaries(): Promise<PlanSummary[]> {
  const folders = await listPlanFolders();
  const summaries: PlanSummary[] = [];

  for (const folder of folders) {
    const plan = await getPlan(folder);
    if (plan) {
      summaries.push({
        // Use folder name as fallback if plan.folder_name is missing
        folder_name: plan.folder_name || folder,
        week_of: plan.week_of,
        theme: plan.theme,
        servings: plan.servings,
        meal_count: plan.meals.length,
        difficulty: plan.difficulty,
        generated_at: plan.generated_at,
      });
    }
  }

  return summaries;
}

/**
 * Read a markdown file from a plan folder
 */
export async function getMarkdownFile(
  slug: string,
  filename: string
): Promise<string | null> {
  try {
    // Handle both with and without .md extension
    const mdFilename = filename.endsWith(".md") ? filename : `${filename}.md`;
    const filePath = path.join(PLANS_DIR, slug, mdFilename);
    return await fs.readFile(filePath, "utf-8");
  } catch {
    console.error(`Failed to read markdown file: ${slug}/${filename}`);
    return null;
  }
}

/**
 * Read a recipe markdown file
 */
export async function getRecipeFile(
  slug: string,
  recipeId: string
): Promise<string | null> {
  try {
    const recipesDir = path.join(PLANS_DIR, slug, "recipes");
    const files = await fs.readdir(recipesDir);

    // Accept a meal id ("m1"), a bare filename ("m1-seared-cod"), or one with
    // the extension — markdown cross-links use the full name.
    const bare = recipeId.replace(/\.md$/, "");
    const recipeFile =
      files.find((f) => f === `${bare}.md`) ??
      files.find((f) => f.startsWith(`${bare}-`));
    if (!recipeFile) {
      return null;
    }

    const filePath = path.join(recipesDir, recipeFile);
    return await fs.readFile(filePath, "utf-8");
  } catch {
    console.error(`Failed to read recipe: ${slug}/recipes/${recipeId}`);
    return null;
  }
}

/**
 * Read a component markdown file
 */
export async function getComponentFile(
  slug: string,
  componentId: string
): Promise<string | null> {
  try {
    const mdFilename = componentId.endsWith(".md")
      ? componentId
      : `${componentId}.md`;
    const filePath = path.join(PLANS_DIR, slug, "components", mdFilename);
    return await fs.readFile(filePath, "utf-8");
  } catch {
    console.error(`Failed to read component: ${slug}/components/${componentId}`);
    return null;
  }
}

/**
 * List all recipe files in a plan
 */
export async function listRecipes(slug: string): Promise<string[]> {
  try {
    const recipesDir = path.join(PLANS_DIR, slug, "recipes");
    const files = await fs.readdir(recipesDir);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
  } catch {
    return [];
  }
}

/**
 * List all component files in a plan
 */
export async function listComponents(slug: string): Promise<string[]> {
  try {
    const componentsDir = path.join(PLANS_DIR, slug, "components");
    const files = await fs.readdir(componentsDir);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
  } catch {
    return [];
  }
}

/**
 * Check if a plan folder exists
 */
export async function planExists(slug: string): Promise<boolean> {
  try {
    const planPath = path.join(PLANS_DIR, slug, "plan.json");
    await fs.access(planPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Watch for new plan folders (returns the newest folder that doesn't exist yet)
 */
export async function findNewPlanFolder(
  existingFolders: string[]
): Promise<string | null> {
  const currentFolders = await listPlanFolders();
  const newFolder = currentFolders.find((f) => !existingFolders.includes(f));
  return newFolder || null;
}
