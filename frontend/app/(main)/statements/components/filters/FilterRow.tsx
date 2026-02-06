"use client";

import { cn } from "@/app/lib/utils";
import { ChevronRight } from "lucide-react";

type FilterRowProps = {
  label: string;
  value?: string | null;
  onClick: () => void;
  className?: string;
};

export function FilterRow({ label, value, onClick, className }: FilterRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl px-4 py-4 text-left transition hover:bg-gray-50",
        className,
      )}
    >
      <div>
        <div className="text-sm font-medium text-gray-500">{label}</div>
        {value ? <div className="text-base font-semibold text-gray-900">{value}</div> : null}
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </button>
  );
}
