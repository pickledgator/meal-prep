import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-ink-faint bg-paper-raised hover:border-rule-strong focus-visible:border-primary aria-invalid:border-destructive flex field-sizing-content min-h-20 w-full rounded-sm border-2 px-3.5 py-2.5 text-base transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
