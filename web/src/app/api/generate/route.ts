import { NextResponse } from "next/server";
import { startGenerationJob } from "@/lib/claude-cli";
import type { GenerateParams } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const params: GenerateParams = {
      meals: body.meals || 3,
      servings: body.servings || 2,
      theme: body.theme || "auto",
      proteins: body.proteins || undefined,
      mustUse: body.mustUse || undefined,
      difficulty: body.difficulty || "normal",
      leftovers: body.leftovers || false,
    };

    // Validate ranges
    if (params.meals < 3 || params.meals > 5) {
      return NextResponse.json(
        { error: "Meals must be between 3 and 5" },
        { status: 400 }
      );
    }

    if (![2, 4, 6].includes(params.servings)) {
      return NextResponse.json(
        { error: "Servings must be 2, 4, or 6" },
        { status: 400 }
      );
    }

    if (!["easy", "normal", "challenging"].includes(params.difficulty)) {
      return NextResponse.json(
        { error: "Difficulty must be easy, normal, or challenging" },
        { status: 400 }
      );
    }

    // Start the generation job
    const jobId = startGenerationJob(params);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Failed to start generation:", error);
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    );
  }
}
