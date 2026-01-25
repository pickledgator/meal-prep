import { NextResponse } from "next/server";
import { getMarkdownFile, getRecipeFile, getComponentFile } from "@/lib/plans";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; file: string }> }
) {
  try {
    const { slug, file } = await params;
    let content: string | null = null;

    // Check if this is a recipe request (e.g., recipes/m1-salmon)
    if (file.startsWith("recipes/")) {
      const recipeId = file.replace("recipes/", "");
      content = await getRecipeFile(slug, recipeId);
    }
    // Check if this is a component request (e.g., components/tzatziki)
    else if (file.startsWith("components/")) {
      const componentId = file.replace("components/", "");
      content = await getComponentFile(slug, componentId);
    }
    // Otherwise it's a top-level markdown file (menu, grocery-list, etc.)
    else {
      content = await getMarkdownFile(slug, file);
    }

    if (!content) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Failed to fetch file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
