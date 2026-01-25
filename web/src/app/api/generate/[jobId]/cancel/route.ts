import { NextResponse } from "next/server";
import { cancelJob, getJob } from "@/lib/claude-cli";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "running") {
    return NextResponse.json(
      { error: "Job is not running", status: job.status },
      { status: 400 }
    );
  }

  const cancelled = cancelJob(jobId);

  if (cancelled) {
    return NextResponse.json({ success: true, status: "cancelled" });
  } else {
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
