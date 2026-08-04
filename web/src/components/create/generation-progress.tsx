"use client";

import { useEffect, useState, useRef } from "react";

const STATUS_COPY = {
  running: "Writing the plan",
  completed: "Plan written",
  failed: "Planner stopped",
  cancelled: "Cancelled",
} as const;

const STATUS_DOT = {
  running: "bg-primary animate-pulse",
  completed: "bg-primary",
  failed: "bg-destructive",
  cancelled: "bg-ink-faint",
} as const;

interface GenerationProgressProps {
  jobId: string;
  onComplete: (resultFolder?: string) => void;
  params: {
    meals: number;
    servings: number;
    theme: string;
    difficulty: string;
  };
}

export function GenerationProgress({
  jobId,
  onComplete,
  params,
}: GenerationProgressProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [status, setStatus] = useState<
    "running" | "completed" | "failed" | "cancelled"
  >("running");
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/generate/${jobId}/cancel`, {
        method: "POST",
      });
      if (response.ok) {
        setStatus("cancelled");
        setError("Cancelled by user");
      }
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
    setCancelling(false);
  };

  useEffect(() => {
    const eventSource = new EventSource(`/api/generate/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "output" && data.lines) {
          setOutput((prev) => [...prev, ...data.lines]);
        }

        if (data.type === "complete") {
          setStatus(data.status);
          if (data.error) {
            setError(data.error);
          }
          eventSource.close();

          // Delay redirect slightly to show final output
          setTimeout(() => {
            onComplete(data.resultFolder);
          }, 1500);
        }

        if (data.type === "error") {
          setError(data.message);
          setStatus("failed");
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      setStatus("failed");
      setError("Connection lost");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, onComplete]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <h2 className="display flex items-center gap-3 text-2xl text-ink">
          <span
            aria-hidden
            className={`inline-block size-2 rounded-full ${STATUS_DOT[status]}`}
          />
          {STATUS_COPY[status]}
        </h2>

        {status === "running" && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="label border-2 border-ink px-3.5 py-2.5 text-ink transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </div>

      <p className="data mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
        <span>{params.meals} dinners</span>
        <span className="text-rule-strong">·</span>
        <span>{params.servings} servings</span>
        <span className="text-rule-strong">·</span>
        <span>{params.difficulty} prep</span>
        {params.theme !== "auto" && (
          <>
            <span className="text-rule-strong">·</span>
            <span>{params.theme}</span>
          </>
        )}
      </p>

      <div
        ref={outputRef}
        className="data mt-8 h-96 overflow-y-auto bg-ink p-5 leading-relaxed text-paper/85"
      >
        {output.length === 0 ? (
          <div className="text-paper/45">
            Starting the planner
            <span className="animate-pulse">▍</span>
          </div>
        ) : (
          output.map((line, index) => (
            <div
              key={index}
              className={
                line.startsWith("[stderr]") ? "text-olive-bright" : undefined
              }
            >
              {line.replace("[stderr] ", "")}
            </div>
          ))
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 border-l-[5px] border-destructive bg-destructive/8 px-5 py-4 text-[0.9375rem] text-ink"
        >
          {error}
        </p>
      )}

      {status === "completed" && (
        <p className="mt-6 border-l-[5px] border-primary bg-accent/28 px-5 py-4 text-[0.9375rem] text-ink">
          Opening the plan now.
        </p>
      )}
    </section>
  );
}
