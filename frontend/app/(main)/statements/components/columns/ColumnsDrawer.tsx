'use client';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { cn } from '@/app/lib/utils';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, GripVertical } from 'lucide-react';
import type { StatementColumn, StatementColumnId } from './statement-columns';

type ColumnsDrawerLabels = {
  title: string;
  save: string;
};

type ColumnsDrawerProps = {
  open: boolean;
  onClose: () => void;
  columns: StatementColumn[];
  onToggle: (id: StatementColumn['id'], value: boolean) => void;
  onReorder: (activeId: StatementColumnId, overId: StatementColumnId) => void;
  onSave: () => void;
  labels: ColumnsDrawerLabels;
};

type SortableColumnItemProps = {
  column: StatementColumn;
  onToggle: (id: StatementColumn['id'], value: boolean) => void;
};

function SortableColumnItem({ column, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-gray-50/70 border-b border-gray-100/70 last:border-b-0',
        isDragging && 'z-10 bg-white/95 shadow-sm',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="-ml-1 rounded p-1 text-gray-300 transition-colors hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          aria-label={`Reorder ${column.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span
          className={cn(
            'text-base font-semibold',
            column.visible ? 'text-gray-900' : 'text-gray-400',
          )}
        >
          {column.label}
        </span>
      </div>
      <Checkbox checked={column.visible} onCheckedChange={value => onToggle(column.id, value)} />
    </div>
  );
}

export function ColumnsDrawer({
  open,
  onClose,
  columns,
  onToggle,
  onReorder,
  onSave,
  labels,
}: ColumnsDrawerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(active.id as StatementColumnId, over.id as StatementColumnId);
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map(column => column.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {columns.map(column => (
                  <SortableColumnItem key={column.id} column={column} onToggle={onToggle} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
