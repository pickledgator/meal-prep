import { NextResponse } from "next/server";
import { startGenerationJob } from "@/lib/claude-cli";
import type { GenerateParams } from "@/lib/types";

const ALLOWED_THEMES = ["auto", "italian", "mediterranean", "asian", "comfort", "budget"];
const ALLOWED_DIFFICULTIES = ["easy", "normal", "challenging"];
const MAX_FREEFORM_LENGTH = 200;

/**
 * Validate free-form ingredient input
 * Returns error message if invalid, null if valid
 */
function validateIngredientInput(input: string | undefined, fieldName: string): string | null {
  if (!input) return null;

  if (input.length > MAX_FREEFORM_LENGTH) {
    return `${fieldName} must be under ${MAX_FREEFORM_LENGTH} characters`;
  }

  // Check for suspicious patterns that might indicate injection attempts
  const suspiciousPatterns = [
    /[<>{}[\]\\|`~^]/,           // Special characters
    /\bignore\b/i,               // Common injection phrase
    /\bsystem\b/i,               // System prompt injection
    /\bprompt\b/i,               // Prompt manipulation
    /\binstruction/i,            // Instruction override
    /\bforget\b/i,               // Memory manipulation
    /--[a-z]/i,                  // CLI flag injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return `${fieldName} contains invalid characters or words`;
    }
  }

  return null;
}

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

    // Validate theme is from allowed list
    const theme = (params.theme || "auto").toLowerCase();
    if (!ALLOWED_THEMES.includes(theme)) {
      return NextResponse.json(
        { error: `Theme must be one of: ${ALLOWED_THEMES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate difficulty is from allowed list
    if (!ALLOWED_DIFFICULTIES.includes(params.difficulty.toLowerCase())) {
      return NextResponse.json(
        { error: `Difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate free-form fields
    const proteinsError = validateIngredientInput(params.proteins, "Proteins");
    if (proteinsError) {
      return NextResponse.json({ error: proteinsError }, { status: 400 });
    }

    const mustUseError = validateIngredientInput(params.mustUse, "Must-use ingredients");
    if (mustUseError) {
      return NextResponse.json({ error: mustUseError }, { status: 400 });
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
