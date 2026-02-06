"use client";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";

type FilterActionsProps = {
  onReset: () => void;
  onApply: () => void;
  applyLabel: string;
  resetLabel: string;
  className?: string;
};

export function FilterActions({
  onReset,
  onApply,
  applyLabel,
  resetLabel,
  className,
}: FilterActionsProps) {
  return (
    <div className={cn("mt-4 flex items-center gap-3", className)}>
      <Button
        variant="secondary"
        size="lg"
        onClick={onReset}
        className="flex-1 rounded-full"
      >
        {resetLabel}
      </Button>
      <Button size="lg" onClick={onApply} className="flex-1 rounded-full">
        {applyLabel}
      </Button>
    </div>
  );
}
