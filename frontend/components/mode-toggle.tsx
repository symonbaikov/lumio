"use client";

import { cn } from "@/app/lib/utils";
import { Check, Laptop, MoonStar, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

type ThemeOption = "light" | "dark" | "system";

type ModeToggleProps = {
  className?: string;
  labels?: {
    light: string;
    dark: string;
    system: string;
    active: string;
    followsSystem: string;
  };
};

const DEFAULT_LABELS = {
  light: "Light",
  dark: "Dark",
  system: "System",
  active: "Active theme",
  followsSystem: "Follows your system settings",
} as const;

export function ModeToggle({ className, labels }: ModeToggleProps) {
  const { setTheme, resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const copy = labels ?? DEFAULT_LABELS;
  const selectedTheme = (theme as ThemeOption) || "system";
  const currentTheme: Exclude<ThemeOption, "system"> =
    mounted && resolvedTheme === "dark" ? "dark" : "light";

  const options = useMemo(
    () => [
      {
        key: "light" as const,
        label: copy.light,
        icon: Sun,
      },
      {
        key: "dark" as const,
        label: copy.dark,
        icon: MoonStar,
      },
      {
        key: "system" as const,
        label: copy.system,
        icon: Laptop,
      },
    ],
    [copy.dark, copy.light, copy.system],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-muted/70 p-1.5"
        aria-label={copy.active}
      >
        {options.map((option) => {
          const Icon = option.icon;
          const active = selectedTheme === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setTheme(option.key)}
              aria-pressed={active}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all duration-200",
                active
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {copy.active}
          </p>
          <div className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {selectedTheme === "system"
                ? `${copy.system} · ${currentTheme === "dark" ? copy.dark : copy.light}`
                : selectedTheme === "dark"
                  ? copy.dark
                  : copy.light}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "rounded-xl border p-3 transition-all duration-200",
            currentTheme === "dark"
              ? "border-sky-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900"
              : "border-slate-300/80 bg-gradient-to-br from-slate-100 via-white to-sky-50",
          )}
        >
          <div
            className={cn(
              "mb-2 h-2.5 w-24 rounded-full",
              currentTheme === "dark" ? "bg-slate-700" : "bg-slate-300",
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <div
              className={cn(
                "h-10 rounded-md border",
                currentTheme === "dark"
                  ? "border-sky-300/20 bg-slate-800"
                  : "border-slate-200 bg-white",
              )}
            />
            <div
              className={cn(
                "h-10 rounded-md border",
                currentTheme === "dark"
                  ? "border-emerald-300/20 bg-slate-800"
                  : "border-slate-200 bg-white",
              )}
            />
          </div>
        </div>

        {selectedTheme === "system" && (
          <p className="mt-2 text-xs text-muted-foreground">
            {copy.followsSystem}
          </p>
        )}
      </div>
    </div>
  );
}
