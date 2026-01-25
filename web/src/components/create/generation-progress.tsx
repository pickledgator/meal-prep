"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [status, setStatus] = useState<"running" | "completed" | "failed">(
    "running"
  );
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {status === "running" && (
                <>
                  <span className="animate-pulse">Generating...</span>
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </>
              )}
              {status === "completed" && (
                <>
                  <span>Complete!</span>
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                </>
              )}
              {status === "failed" && (
                <>
                  <span>Failed</span>
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                </>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{params.meals} meals</Badge>
              <Badge variant="outline">{params.servings} servings</Badge>
              <Badge variant="outline">{params.difficulty}</Badge>
              {params.theme !== "auto" && (
                <Badge variant="secondary">{params.theme}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={outputRef}
            className="h-96 overflow-y-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm text-zinc-100"
          >
            {output.length === 0 ? (
              <div className="text-zinc-500">
                Starting Claude CLI...
                <span className="animate-pulse">|</span>
              </div>
            ) : (
              output.map((line, index) => (
                <div
                  key={index}
                  className={
                    line.startsWith("[stderr]")
                      ? "text-yellow-400"
                      : "text-zinc-100"
                  }
                >
                  {line.replace("[stderr] ", "")}
                </div>
              ))
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {status === "completed" && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
              Meal plan generated successfully! Redirecting...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
