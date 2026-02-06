"use client";

import { DrawerShell } from "@/app/components/ui/drawer-shell";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { cn } from "@/app/lib/utils";
import { ChevronLeft, GripVertical } from "lucide-react";
import type { StatementColumn } from "./statement-columns";

type ColumnsDrawerLabels = {
  title: string;
  save: string;
};

type ColumnsDrawerProps = {
  open: boolean;
  onClose: () => void;
  columns: StatementColumn[];
  onToggle: (id: StatementColumn["id"], value: boolean) => void;
  onSave: () => void;
  labels: ColumnsDrawerLabels;
};

export function ColumnsDrawer({
  open,
  onClose,
  columns,
  onToggle,
  onSave,
  labels,
}: ColumnsDrawerProps) {
  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      position="right"
      width="sm"
      showCloseButton={false}
      className="bg-[#fbfaf8] border-l-0"
      title={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={labels.title}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-gray-900">{labels.title}</span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-gray-50/70 border-b border-gray-100/70 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-300" />
                  <span
                    className={cn(
                      "text-base font-semibold",
                      column.visible ? "text-gray-900" : "text-gray-400",
                    )}
                  >
                    {column.label}
                  </span>
                </div>
                <Checkbox
                  checked={column.visible}
                  onCheckedChange={(value) => onToggle(column.id, value)}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="sticky bottom-0 pt-4 pb-2 bg-[#fbfaf8]">
          <Button className="w-full rounded-full" size="lg" onClick={onSave}>
            {labels.save}
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}
