import { spawn, ChildProcess } from "child_process";
import type { GenerateParams, GenerateJob } from "./types";

// In-memory job storage (in production, use a proper store)
const jobs = new Map<string, GenerateJob>();

// Store process references for cancellation
const processes = new Map<string, ChildProcess>();

/**
 * Parse stream-json output from Claude CLI
 * Returns formatted lines for display
 */
function parseStreamJson(text: string): string[] {
  const lines: string[] = [];

  // Split by newlines and try to parse each as JSON
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed);

      // Handle different event types
      if (event.type === "system" && event.subtype === "init") {
        // Initial system message - skip or show minimal info
        lines.push("✓ Connected to Claude");
      } else if (event.type === "assistant" && event.message?.content) {
        // Assistant message with content blocks
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            // Add text content, split into lines
            const textLines = block.text.split("\n").filter(Boolean);
            lines.push(...textLines);
          } else if (block.type === "tool_use") {
            // Tool being called - format nicely
            const inputStr = JSON.stringify(block.input);
            const shortInput = inputStr.length > 80 ? inputStr.slice(0, 80) + "..." : inputStr;
            lines.push(`⏺ ${block.name}: ${shortInput}`);
          }
        }
      } else if (event.type === "tool_result") {
        // Tool result - could show success/failure
        // Skip for now to reduce noise
      } else if (event.type === "result") {
        // Final result
        if (event.subtype === "success") {
          lines.push("✓ Generation complete!");
        } else if (event.is_error) {
          lines.push(`❌ Error: ${event.result || "Unknown error"}`);
        }
      } else if (event.type === "error") {
        lines.push(`❌ Error: ${event.error?.message || event.message || "Unknown error"}`);
      }
    } catch (e) {
      // Not valid JSON - log for debugging
      console.log("[claude-cli] Failed to parse JSON line:", trimmed.slice(0, 100));
    }
  }

  return lines;
}

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sanitize free-form input to prevent prompt injection
 * Only allows characters typical in ingredient lists
 */
function sanitizeIngredientInput(input: string): string {
  const maxLength = 200;
  let sanitized = input.slice(0, maxLength);
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s,\-']/g, "");
  sanitized = sanitized.replace(/\s+/g, " ").replace(/,+/g, ",").trim();
  sanitized = sanitized.replace(/^,+|,+$/g, "").trim();
  return sanitized;
}

/**
 * Validate that a theme value is from the allowed list
 */
function sanitizeTheme(theme: string): string {
  const allowedThemes = ["auto", "italian", "mediterranean", "asian", "comfort", "budget"];
  const normalized = theme.toLowerCase().trim();
  return allowedThemes.includes(normalized) ? normalized : "auto";
}

/**
 * Validate difficulty is from allowed list
 */
function sanitizeDifficulty(difficulty: string): string {
  const allowedDifficulties = ["easy", "normal", "challenging"];
  const normalized = difficulty.toLowerCase().trim();
  return allowedDifficulties.includes(normalized) ? normalized : "normal";
}

/**
 * Build the skill invocation prompt
 */
function buildSkillPrompt(params: GenerateParams): string {
  const parts: string[] = ["/meal-prep"];

  const meals = Math.min(Math.max(Math.floor(params.meals), 3), 5);
  const servings = [2, 4, 6].includes(params.servings) ? params.servings : 2;

  parts.push(`--meals ${meals}`);
  parts.push(`--servings ${servings}`);

  const theme = sanitizeTheme(params.theme || "auto");
  if (theme !== "auto") {
    parts.push(`--theme ${theme}`);
  }

  if (params.proteins) {
    const sanitizedProteins = sanitizeIngredientInput(params.proteins);
    if (sanitizedProteins) {
      parts.push(`--proteins "${sanitizedProteins}"`);
    }
  }

  if (params.mustUse) {
    const sanitizedMustUse = sanitizeIngredientInput(params.mustUse);
    if (sanitizedMustUse) {
      parts.push(`--must-use "${sanitizedMustUse}"`);
    }
  }

  const difficulty = sanitizeDifficulty(params.difficulty);
  parts.push(`--difficulty ${difficulty}`);

  if (params.leftovers) {
    parts.push("--leftovers");
  }

  return parts.join(" ");
}

/**
 * Start a new generation job
 */
export function startGenerationJob(params: GenerateParams): string {
  const jobId = generateJobId();

  const job: GenerateJob = {
    id: jobId,
    status: "running",
    params,
    output: [],
    createdAt: new Date().toISOString(),
  };

  jobs.set(jobId, job);

  // Working directory should be the meal-prep root (one level up from web/)
  const cwd = process.cwd().replace(/\/web$/, "");
  const skillPrompt = buildSkillPrompt(params);

  console.log("[claude-cli] Starting job:", jobId);
  console.log("[claude-cli] Skill prompt:", skillPrompt);
  console.log("[claude-cli] Working directory:", cwd);

  // Use stream-json format for clean structured output
  // Need to pass --allowedTools since project settings may not apply to spawned process
  const allowedTools = "Read,Write,WebSearch,WebFetch,Bash(mkdir:*),Bash(date:*)";

  const args = [
    "--verbose",
    "--output-format", "stream-json",
    "--allowedTools", allowedTools,
    "-p", skillPrompt,
  ];

  const proc: ChildProcess = spawn("claude", args, {
    cwd,
    env: { ...process.env },
    detached: true, // Create process group for clean cancellation
  });

  // Store process reference for cancellation
  processes.set(jobId, proc);

  console.log("[claude-cli] Process spawned, PID:", proc.pid);

  // Buffer for incomplete JSON lines
  let stdoutBuffer = "";

  // Capture stdout - parse stream-json format
  proc.stdout?.on("data", (data: Buffer) => {
    stdoutBuffer += data.toString();

    // Process complete lines (JSON is newline-delimited)
    const lines = stdoutBuffer.split("\n");
    // Keep the last potentially incomplete line in the buffer
    stdoutBuffer = lines.pop() || "";

    const parsedLines = parseStreamJson(lines.join("\n"));
    const currentJob = jobs.get(jobId);
    if (currentJob && parsedLines.length > 0) {
      currentJob.output.push(...parsedLines);
      console.log("[claude-cli] Added", parsedLines.length, "lines to output");
    }
  });

  // Capture stderr
  proc.stderr?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    const currentJob = jobs.get(jobId);
    if (currentJob && text) {
      // Stderr is usually plain text errors
      currentJob.output.push(`[stderr] ${text}`);
    }
  });

  // Handle process completion
  proc.on("close", (code: number | null) => {
    console.log("[claude-cli] Process closed with code:", code);
    processes.delete(jobId);
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      console.log("[claude-cli] Job output lines:", currentJob.output.length);
      currentJob.completedAt = new Date().toISOString();
      // Check if it was cancelled
      if (currentJob.status === "cancelled") {
        // Already marked as cancelled, don't overwrite
      } else if (code === 0) {
        currentJob.status = "completed";
        // Try to extract the result folder from output
        const folderMatch = currentJob.output
          .join("\n")
          .match(/plans\/([0-9]{4}-[0-9]{2}-[0-9]{2}[^\s\/]*)/);
        if (folderMatch) {
          currentJob.resultFolder = folderMatch[1];
          console.log("[claude-cli] Detected result folder:", currentJob.resultFolder);
        }
      } else {
        currentJob.status = "failed";
        currentJob.error = `Process exited with code ${code}`;
        console.log("[claude-cli] Job failed:", currentJob.error);
      }
    }
  });

  proc.on("error", (err: Error) => {
    console.error("[claude-cli] Process error:", err);
    processes.delete(jobId);
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
 * Cancel a running job
 */
export function cancelJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  const proc = processes.get(jobId);

  if (!job || job.status !== "running") {
    return false;
  }

  console.log("[claude-cli] Cancelling job:", jobId);

  // Mark as cancelled before killing
  job.status = "cancelled";
  job.error = "Cancelled by user";
  job.completedAt = new Date().toISOString();

  // Kill the process tree
  if (proc && proc.pid) {
    try {
      // Kill the process group to get all children (expect + claude)
      process.kill(-proc.pid, "SIGTERM");
    } catch {
      // Try regular kill if process group fails
      try {
        proc.kill("SIGTERM");
      } catch {
        // Process might already be dead
      }
    }
  }

  processes.delete(jobId);
  return true;
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
