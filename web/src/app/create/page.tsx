import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GenerationForm } from "@/components/create/generation-form";

export default function CreatePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="-ml-2 mb-4">
            <span className="mr-2">&larr;</span>
            Back to Plans
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Plan</h1>
        <p className="text-muted-foreground">
          Generate a personalized weekly meal prep plan
        </p>
      </div>

      <GenerationForm />
    </div>
  );
}
