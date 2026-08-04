"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenerationProgress } from "./generation-progress";

interface FormData {
  meals: number;
  servings: number;
  theme: string;
  proteins: string;
  mustUse: string;
  difficulty: "easy" | "normal" | "challenging";
  leftovers: boolean;
}

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mt-12 first:mt-0">
      <legend className="label section-tab mb-6">{legend}</legend>
      <div className="space-y-6">{children}</div>
    </fieldset>
  );
}

export function GenerationForm() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    meals: 3,
    servings: 2,
    theme: "auto",
    proteins: "",
    mustUse: "",
    difficulty: "normal",
    leftovers: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`The planner returned ${response.status}.`);
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (error) {
      console.error("Generation error:", error);
      setSubmitError(
        error instanceof Error
          ? `We couldn't start the planner. ${error.message}`
          : "We couldn't start the planner. Check that the server is running, then try again."
      );
      setIsGenerating(false);
    }
  };

  const handleComplete = (resultFolder?: string) => {
    if (resultFolder) {
      router.push(`/plans/${resultFolder}`);
    } else {
      // If no folder detected, go back to home to find it
      router.push("/");
    }
  };

  if (isGenerating && jobId) {
    return (
      <GenerationProgress
        jobId={jobId}
        onComplete={handleComplete}
        params={formData}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Fieldset legend="The week">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2.5">
            <Label htmlFor="meals">Dinners</Label>
            <Select
              value={formData.meals.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, meals: parseInt(value) })
              }
            >
              <SelectTrigger id="meals" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 dinners</SelectItem>
                <SelectItem value="4">4 dinners</SelectItem>
                <SelectItem value="5">5 dinners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="servings">Servings each</Label>
            <Select
              value={formData.servings.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, servings: parseInt(value) })
              }
            >
              <SelectTrigger id="servings" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 servings</SelectItem>
                <SelectItem value="4">4 servings</SelectItem>
                <SelectItem value="6">6 servings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="difficulty">Sunday prep</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                difficulty: value as "easy" | "normal" | "challenging",
              })
            }
          >
            <SelectTrigger id="difficulty" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy — store-bought welcome</SelectItem>
              <SelectItem value="normal">
                Normal — a few things from scratch
              </SelectItem>
              <SelectItem value="challenging">
                Challenging — build it all
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="leftovers"
            checked={formData.leftovers}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, leftovers: checked === true })
            }
          />
          <Label htmlFor="leftovers" className="no-caps cursor-pointer">
            Double the portions for leftovers
          </Label>
        </div>
      </Fieldset>

      <Fieldset legend="Direction">
        <div className="space-y-2.5">
          <Label htmlFor="theme">Cuisine</Label>
          <Select
            value={formData.theme}
            onValueChange={(value) => setFormData({ ...formData, theme: value })}
          >
            <SelectTrigger id="theme" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Surprise me</SelectItem>
              <SelectItem value="italian">Italian</SelectItem>
              <SelectItem value="mediterranean">Mediterranean</SelectItem>
              <SelectItem value="asian">Asian</SelectItem>
              <SelectItem value="comfort">Comfort</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="proteins">Proteins</Label>
          <Input
            id="proteins"
            placeholder="scallops, chicken thighs"
            value={formData.proteins}
            onChange={(e) =>
              setFormData({ ...formData, proteins: e.target.value })
            }
          />
          <p className="data text-ink-faint">
            Comma-separated. Leave it empty to let the planner vary them.
          </p>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="mustUse">In the fridge already</Label>
          <Textarea
            id="mustUse"
            placeholder="one large zucchini, brussels sprouts, broccoli"
            value={formData.mustUse}
            onChange={(e) =>
              setFormData({ ...formData, mustUse: e.target.value })
            }
            rows={2}
          />
          <p className="data text-ink-faint">
            These get designed into the week so nothing is wasted.
          </p>
        </div>
      </Fieldset>

      {submitError && (
        <p
          role="alert"
          className="mt-10 border-l-[5px] border-destructive bg-destructive/8 px-5 py-4 text-[0.9375rem] text-ink"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isGenerating}
        className="label mt-12 inline-flex w-full items-center justify-center gap-2.5 bg-ink px-6 py-5 text-paper transition-colors duration-200 hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isGenerating ? "Starting the planner…" : "Write the plan"}
        <span aria-hidden>&rarr;</span>
      </button>
    </form>
  );
}
