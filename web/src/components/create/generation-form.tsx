"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function GenerationForm() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
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
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to start generation");
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (error) {
      console.error("Generation error:", error);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meals">Number of Meals</Label>
              <Select
                value={formData.meals.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, meals: parseInt(value) })
                }
              >
                <SelectTrigger id="meals">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meals</SelectItem>
                  <SelectItem value="4">4 meals</SelectItem>
                  <SelectItem value="5">5 meals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings">Servings per Meal</Label>
              <Select
                value={formData.servings.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, servings: parseInt(value) })
                }
              >
                <SelectTrigger id="servings">
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

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  difficulty: value as "easy" | "normal" | "challenging",
                })
              }
            >
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="challenging">Challenging</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Affects Sunday prep complexity
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="leftovers"
              checked={formData.leftovers}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, leftovers: checked === true })
              }
            />
            <Label htmlFor="leftovers" className="cursor-pointer">
              Double portions for leftovers
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Cuisine Theme</Label>
            <Select
              value={formData.theme}
              onValueChange={(value) =>
                setFormData({ ...formData, theme: value })
              }
            >
              <SelectTrigger id="theme">
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

          <div className="space-y-2">
            <Label htmlFor="proteins">Protein Preferences</Label>
            <Input
              id="proteins"
              placeholder="e.g., salmon, chicken thighs (optional)"
              value={formData.proteins}
              onChange={(e) =>
                setFormData({ ...formData, proteins: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of preferred proteins
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mustUse">Ingredients to Use Up</Label>
            <Textarea
              id="mustUse"
              placeholder="e.g., butternut squash, blood oranges (optional)"
              value={formData.mustUse}
              onChange={(e) =>
                setFormData({ ...formData, mustUse: e.target.value })
              }
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Ingredients you need to incorporate
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full">
        Generate Meal Plan
      </Button>
    </form>
  );
}
