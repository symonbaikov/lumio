"use client";

import { cn } from "@/app/lib/utils";

type FilterSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function FilterSection({ title, children, className }: FilterSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="rounded-2xl bg-transparent p-0">
        <div className="space-y-2">{children}</div>
      </div>
    </section>
  );
}
