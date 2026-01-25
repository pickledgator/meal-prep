import { spawn, ChildProcess } from "child_process";
import type { GenerateParams, GenerateJob } from "./types";

// In-memory job storage (in production, use a proper store)
const jobs = new Map<string, GenerateJob>();

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build CLI arguments from generation parameters
 */
function buildCliArgs(params: GenerateParams): string[] {
  const args: string[] = ["/meal-prep"];

  args.push("--meals", params.meals.toString());
  args.push("--servings", params.servings.toString());

  if (params.theme && params.theme !== "auto") {
    args.push("--theme", params.theme);
  }

  if (params.proteins) {
    args.push("--proteins", params.proteins);
  }

  if (params.mustUse) {
    args.push("--must-use", params.mustUse);
  }

  args.push("--difficulty", params.difficulty);

  if (params.leftovers) {
    args.push("--leftovers");
  }

  return args;
}

/**
 * Start a new generation job
 */
export function startGenerationJob(params: GenerateParams): string {
  const jobId = generateJobId();
  const args = buildCliArgs(params);

  const job: GenerateJob = {
    id: jobId,
    status: "running",
    params,
    output: [],
    createdAt: new Date().toISOString(),
  };

  jobs.set(jobId, job);

  // Spawn the Claude CLI process
  // The working directory should be the meal-prep root (one level up from web/)
  const cwd = process.cwd().replace(/\/web$/, "");

  const proc: ChildProcess = spawn("claude", args, {
    cwd,
    shell: true,
    env: { ...process.env },
  });

  // Capture stdout
  proc.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      currentJob.output.push(...lines);
    }
  });

  // Capture stderr
  proc.stderr?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      currentJob.output.push(...lines.map((l) => `[stderr] ${l}`));
    }
  });

  // Handle process completion
  proc.on("close", (code: number | null) => {
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      currentJob.completedAt = new Date().toISOString();
      if (code === 0) {
        currentJob.status = "completed";
        // Try to extract the result folder from output
        const folderMatch = currentJob.output
          .join("\n")
          .match(/plans\/([0-9]{4}-[0-9]{2}-[0-9]{2}[^\s\/]*)/);
        if (folderMatch) {
          currentJob.resultFolder = folderMatch[1];
        }
      } else {
        currentJob.status = "failed";
        currentJob.error = `Process exited with code ${code}`;
      }
    }
  });

  proc.on("error", (err: Error) => {
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      currentJob.status = "failed";
      currentJob.error = err.message;
      currentJob.completedAt = new Date().toISOString();
    }
  });

  return jobId;
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string): GenerateJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Get job output starting from a specific index
 */
export function getJobOutput(
  jobId: string,
  fromIndex: number = 0
): { lines: string[]; done: boolean; status: string } | null {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }

  return {
    lines: job.output.slice(fromIndex),
    done: job.status !== "running",
    status: job.status,
  };
}

/**
 * Clean up old jobs (call periodically)
 */
export function cleanupOldJobs(maxAgeMs: number = 1000 * 60 * 60): void {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    const createdAt = new Date(job.createdAt).getTime();
    if (now - createdAt > maxAgeMs) {
      jobs.delete(id);
    }
  }
}
