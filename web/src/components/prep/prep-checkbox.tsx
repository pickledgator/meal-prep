import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PrepCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Bold first line: icon slot + task title (+ quantity). */
  title: ReactNode;
  /** Quieter ruled block under the title: method text or allocation list. */
  detail?: ReactNode;
  className?: string;
}

/**
 * One prep task with a check-off box. Purely presentational now — the old
 * version regex-split rendered markdown into header/description; structured
 * prep tasks pass those parts explicitly, and state lives with the caller
 * (localStorage via usePrepState).
 */
export function PrepCheckbox({ checked, onCheckedChange, title, detail, className }: PrepCheckboxProps) {
  return (
    <div
      className={cn(
        "-mx-2 flex min-h-11 items-start gap-3 rounded px-2 py-2 transition-colors hover:bg-accent/35",
        className,
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} className="mt-1" />
      <div className={cn("flex-1 transition-colors", checked && "opacity-55")}>
        <div className={cn("font-medium text-ink", checked && "line-through decoration-ink-faint")}>{title}</div>
        {detail && (
          <div
            className={cn(
              "mt-1 border-l-2 border-rule pl-3 text-[0.9375rem] text-ink-muted",
              checked && "line-through decoration-ink-faint",
            )}
          >
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
