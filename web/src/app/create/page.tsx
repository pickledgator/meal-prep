import type { Metadata } from "next";
import { FolioHeader } from "@/components/plans/folio-header";
import { GenerationForm } from "@/components/create/generation-form";

export const metadata: Metadata = {
  title: "Plan a week",
  description:
    "Set meals, servings, and what needs using up — then let the planner write the week.",
};

export default function CreatePage() {
  return (
    <div className="max-w-2xl">
      <FolioHeader
        back={{ href: "/", label: "Back to the archive" }}
        kicker="New plan"
        title="Plan a week"
        standfirst="Answer what you know. Anything left on auto gets chosen around the season and what you cooked recently."
      />

      <GenerationForm />
    </div>
  );
}
