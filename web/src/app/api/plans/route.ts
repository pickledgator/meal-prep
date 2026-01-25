import { NextResponse } from "next/server";
import { getAllPlanSummaries } from "@/lib/plans";

export async function GET() {
  try {
    const plans = await getAllPlanSummaries();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
