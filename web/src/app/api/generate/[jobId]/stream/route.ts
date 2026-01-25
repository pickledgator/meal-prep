import { getJob } from "@/lib/claude-cli";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let lastIndex = 0;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status
      const sendEvent = (data: object) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed
          isClosed = true;
        }
      };

      // Poll for updates
      const pollInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(pollInterval);
          return;
        }

        const currentJob = getJob(jobId);
        if (!currentJob) {
          clearInterval(pollInterval);
          sendEvent({ type: "error", message: "Job not found" });
          controller.close();
          return;
        }

        // Send new output lines
        if (currentJob.output.length > lastIndex) {
          const newLines = currentJob.output.slice(lastIndex);
          lastIndex = currentJob.output.length;
          sendEvent({ type: "output", lines: newLines });
        }

        // Check if job is complete
        if (currentJob.status !== "running") {
          clearInterval(pollInterval);
          sendEvent({
            type: "complete",
            status: currentJob.status,
            resultFolder: currentJob.resultFolder,
            error: currentJob.error,
          });
          controller.close();
        }
      }, 100); // Poll every 100ms

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
