'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { Search } from '@/app/components/icons';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import type { ActorType, AuditAction, AuditEventFilter } from '@/lib/api/audit';

type ActorTypeOption = { value: ActorType | ''; label: string };
type ActionOption = { value: AuditAction | ''; label: string };

const ACTOR_OPTIONS: ActorTypeOption[] = [
  { value: '', label: 'All users' },
  { value: 'user', label: 'User' },
  { value: 'system', label: 'System' },
  { value: 'integration', label: 'Integration' },
];

const ACTION_OPTIONS: ActionOption[] = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
  { value: 'link', label: 'Link' },
  { value: 'unlink', label: 'Unlink' },
  { value: 'match', label: 'Merge' },
  { value: 'apply_rule', label: 'Categorize' },
  { value: 'rollback', label: 'Rollback' },
];

type DatePreset = '7d' | '30d' | '90d' | 'all';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function presetToDates(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === 'all') {
    return {};
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  return { dateFrom: daysAgoIso(days), dateTo: undefined };
}

function currentPreset(filters: AuditEventFilter): DatePreset {
  if (!filters.dateFrom) {
    return '7d';
  }
  const diff = Math.round((Date.now() - new Date(filters.dateFrom).getTime()) / 86_400_000);
  if (diff <= 7) {
    return '7d';
  }
  if (diff <= 30) {
    return '30d';
  }
  if (diff <= 90) {
    return '90d';
  }
  return 'all';
}

function dateChipLabel(filters: AuditEventFilter): string {
  const preset = currentPreset(filters);
  return DATE_PRESETS.find(p => p.value === preset)?.label ?? 'Last 7 days';
}

interface AuditFilterBarProps {
  filters: AuditEventFilter;
  onFiltersChange: (update: Partial<AuditEventFilter>) => void;
}

export function AuditFilterBar({ filters, onFiltersChange }: AuditFilterBarProps) {
  const [usersOpen, setUsersOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  // Pending state for dropdowns (apply on confirm)
  const [pendingActorType, setPendingActorType] = useState<ActorType | ''>(filters.actorType ?? '');
  const [pendingAction, setPendingAction] = useState<AuditAction | ''>(filters.action ?? '');
  const [pendingDatePreset, setPendingDatePreset] = useState<DatePreset>(currentPreset(filters));

  // Search debounce
  const [searchVal, setSearchVal] = useState(filters.actorLabel ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (val: string) => {
      setSearchVal(val);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onFiltersChange({ actorLabel: val || undefined });
      }, 300);
    },
    [onFiltersChange],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const applyUsers = () => {
    onFiltersChange({ actorType: pendingActorType || undefined });
    setUsersOpen(false);
  };
  const resetUsers = () => {
    setPendingActorType('');
    onFiltersChange({ actorType: undefined });
    setUsersOpen(false);
  };

  const applyActions = () => {
    onFiltersChange({ action: pendingAction || undefined });
    setActionsOpen(false);
  };
  const resetActions = () => {
    setPendingAction('');
    onFiltersChange({ action: undefined });
    setActionsOpen(false);
  };

  const applyDate = () => {
    onFiltersChange(presetToDates(pendingDatePreset));
    setDateOpen(false);
  };
  const resetDate = () => {
    setPendingDatePreset('7d');
    onFiltersChange(presetToDates('7d'));
    setDateOpen(false);
  };

  const usersActive = Boolean(filters.actorType);
  const actionsActive = Boolean(filters.action);
  const dateActive = currentPreset(filters) !== '7d';

  const usersLabel = filters.actorType
    ? (ACTOR_OPTIONS.find(o => o.value === filters.actorType)?.label ?? 'All users')
    : 'All users';

  const actionsLabel = filters.action
    ? (ACTION_OPTIONS.find(o => o.value === filters.action)?.label ?? 'All actions')
    : 'All actions';

  return (
    <div className="audit-filter-bar">
      {/* Search */}
      <div className="audit-search-wrap">
        <Search size={14} />
        <input
          className="audit-search"
          placeholder="Search actions, users…"
          value={searchVal}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Users chip */}
      <FilterDropdown
        open={usersOpen}
        onOpenChange={open => {
          setUsersOpen(open);
          if (open) {
            setPendingActorType(filters.actorType ?? '');
          }
        }}
        trigger={<FilterChipButton active={usersActive}>{usersLabel}</FilterChipButton>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ACTOR_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <input
                type="radio"
                name="audit-actor-type"
                value={opt.value}
                checked={pendingActorType === opt.value}
                onChange={() => setPendingActorType(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <FilterActions
          applyLabel="Apply"
          resetLabel="Reset"
          onApply={applyUsers}
          onReset={resetUsers}
        />
      </FilterDropdown>

      {/* Actions chip */}
      <FilterDropdown
        open={actionsOpen}
        onOpenChange={open => {
          setActionsOpen(open);
          if (open) {
            setPendingAction(filters.action ?? '');
          }
        }}
        trigger={<FilterChipButton active={actionsActive}>{actionsLabel}</FilterChipButton>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ACTION_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <input
                type="radio"
                name="audit-action"
                value={opt.value}
                checked={pendingAction === opt.value}
                onChange={() => setPendingAction(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <FilterActions
          applyLabel="Apply"
          resetLabel="Reset"
          onApply={applyActions}
          onReset={resetActions}
        />
      </FilterDropdown>

      {/* Date chip */}
      <FilterDropdown
        open={dateOpen}
        onOpenChange={open => {
          setDateOpen(open);
          if (open) {
            setPendingDatePreset(currentPreset(filters));
          }
        }}
        trigger={<FilterChipButton active={dateActive}>{dateChipLabel(filters)}</FilterChipButton>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DATE_PRESETS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <input
                type="radio"
                name="audit-date-preset"
                value={opt.value}
                checked={pendingDatePreset === opt.value}
                onChange={() => setPendingDatePreset(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <FilterActions
          applyLabel="Apply"
          resetLabel="Reset"
          onApply={applyDate}
          onReset={resetDate}
        />
      </FilterDropdown>
    </div>
  );
}
