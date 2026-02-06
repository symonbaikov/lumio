"use client";

import { cn } from "@/app/lib/utils";
import { Check } from "lucide-react";

type FilterOptionRowProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant?: "radio" | "checkbox";
  className?: string;
};

export function FilterOptionRow({
  label,
  selected,
  onClick,
  variant = "radio",
  className,
}: FilterOptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left text-base font-semibold text-gray-900 transition hover:bg-gray-50",
        className,
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full",
          selected
            ? "bg-primary text-white"
            : "bg-gray-100 text-transparent",
          variant === "checkbox" && "rounded-md",
        )}
      >
        {selected && <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}
