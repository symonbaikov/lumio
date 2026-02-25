'use client';

import { cn } from '@/app/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Minus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import React, { isValidElement, useMemo } from 'react';
import { useSidePanel } from '../SidePanelContext';
import {
  ACTION_VARIANTS,
  type ActionItem,
  type ActionsSection,
  BADGE_VARIANTS,
  type ChartItem,
  type ChartSection,
  type CustomSection,
  type ErrorItem,
  type ErrorSection,
  type MetricsSection,
  type NavigationItem,
  type NavigationSection,
  STATUS_COLORS,
  type SettingsSection,
  type SettingsSelectItem,
  type SettingsToggleItem,
  type SidePanelSection,
  type StatusItem,
  type StatusSection,
  type SummaryItem,
  type SummarySection,
} from '../types';

// ============================================================================
// Helper Components
// ============================================================================

/** Render icon - handles both LucideIcon and ReactNode */
function RenderIcon({
  icon,
  className,
  size = 16,
}: {
  icon: NavigationItem['icon'];
  className?: string;
  size?: number;
}) {
  if (!icon) return null;

  // If it's a React element, render it directly
  if (isValidElement(icon)) {
    return <span className={className}>{icon}</span>;
  }

  // If it's a Lucide icon component
  const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} className={className} />;
}

/** Section wrapper with optional collapse */
function SectionWrapper({
  section,
  children,
}: {
  section: SidePanelSection;
  children: React.ReactNode;
}) {
  const { collapsedSections, toggleSection } = useSidePanel();
  const isCollapsed = section.collapsible
    ? collapsedSections.has(section.id) || (section.defaultCollapsed ?? false)
    : false;

  if (section.hidden) return null;

  return (
    <div className={cn('mb-1', section.className)}>
      {section.title && (
        <button
          type="button"
          onClick={() => section.collapsible && toggleSection(section.id)}
          disabled={!section.collapsible}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2 mt-3 first:mt-1',
            'text-[14px] font-normal text-gray-400 dark:text-gray-500',
            section.titleClassName,
            section.collapsible &&
              'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer rounded-xl',
          )}
        >
          <div className="flex items-center gap-2">
            {section.icon && <RenderIcon icon={section.icon} size={14} />}
            <span>{section.title}</span>
          </div>
          {section.collapsible && (
            <ChevronDown
              size={14}
              className={cn('transition-transform duration-200', isCollapsed && '-rotate-90')}
            />
          )}
        </button>
      )}
      <div
        className={cn(
          'transition-all duration-200 overflow-hidden',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100',
        )}
      >
        <div className={cn('px-4 pb-3', !section.title && 'pt-3', section.contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Navigation Section
// ============================================================================

function NavigationItemComponent({ item, depth = 0 }: { item: NavigationItem; depth?: number }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const emphasis = item.emphasis || 'default';
  const isHighEmphasis = emphasis === 'high';
  const isLowEmphasis = emphasis === 'low';

  const content = (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {item.icon && (
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center transition-colors',
              isHighEmphasis
                ? item.active
                  ? 'text-primary'
                  : 'text-gray-700 dark:text-gray-200'
                : isLowEmphasis
                  ? item.active
                    ? 'text-gray-500 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500'
                  : item.active
                    ? 'text-primary'
                    : 'text-gray-500 dark:text-gray-400',
            )}
          >
            <RenderIcon icon={item.icon} size={20} className="shrink-0" />
          </span>
        )}
        <span className="truncate">{item.label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.badge !== undefined && (
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-semibold rounded-full',
              BADGE_VARIANTS[item.badgeVariant || 'default'],
            )}
          >
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <ChevronRight
            size={14}
            className={cn('text-gray-400 transition-transform', isExpanded && 'rotate-90')}
          />
        )}
      </div>
    </>
  );

  const baseClasses = cn(
    'w-full flex items-center justify-between gap-2 px-4 py-2.5 my-0.5 rounded-[14px] text-sm transition-all duration-200',
    'focus:outline-none focus-visible:ring-0',
    item.disabled && 'opacity-50 cursor-not-allowed',
    item.active
      ? isHighEmphasis
        ? 'text-gray-900 font-semibold bg-primary/10 ring-1 ring-primary/20 dark:bg-primary/20 dark:text-gray-100'
        : isLowEmphasis
          ? 'text-gray-700 font-medium bg-gray-100/40 dark:bg-gray-800/40 dark:text-gray-200'
          : 'text-gray-900 font-medium bg-gray-100/50 dark:bg-gray-800/50 dark:text-gray-100'
      : isHighEmphasis
        ? 'text-gray-700 font-semibold hover:bg-primary/5 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-primary/10 dark:hover:text-gray-100'
        : isLowEmphasis
          ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-50/70 hover:text-gray-700 dark:hover:bg-gray-800/40 dark:hover:text-gray-200'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:hover:text-gray-100',
    depth > 0 && 'ml-6',
  );

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (item.onClick && !item.disabled) {
      item.onClick();
    }
  };

  return (
    <div>
      {item.href && !hasChildren ? (
        <Link href={item.href} className={baseClasses}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={item.disabled}
          className={baseClasses}
        >
          {content}
        </button>
      )}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {(item.children ?? []).map(child => (
            <NavigationItemComponent key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NavigationSectionRenderer({ section }: { section: NavigationSection }) {
  return (
    <SectionWrapper section={section}>
      <div className="space-y-1">
        {section.items.map(item => (
          <NavigationItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Status Section
// ============================================================================

function StatusItemComponent({ item }: { item: StatusItem }) {
  const formattedTime = useMemo(() => {
    if (!item.timestamp) return null;
    const date = typeof item.timestamp === 'string' ? new Date(item.timestamp) : item.timestamp;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [item.timestamp]);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_COLORS[item.status])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {item.icon && <RenderIcon icon={item.icon} size={14} className="text-gray-400" />}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.label}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {item.description}
          </p>
        )}
      </div>
      {formattedTime && <span className="text-xs text-gray-400 shrink-0">{formattedTime}</span>}
    </div>
  );
}

export function StatusSectionRenderer({ section }: { section: StatusSection }) {
  return (
    <SectionWrapper section={section}>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {section.items.map(item => (
          <StatusItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Summary/Metrics Section
// ============================================================================

function SummaryItemComponent({ item }: { item: SummaryItem }) {
  const formattedValue = useMemo(() => {
    if (typeof item.value === 'string') return item.value;

    let formatted: string;
    switch (item.format) {
      case 'currency':
        formatted = new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'KZT',
          minimumFractionDigits: 0,
        }).format(item.value);
        break;
      case 'percentage':
        formatted = `${item.value}%`;
        break;
      case 'number':
        formatted = new Intl.NumberFormat('ru-RU').format(item.value);
        break;
      default:
        formatted = String(item.value);
    }

    return `${item.prefix || ''}${formatted}${item.suffix || ''}`;
  }, [item]);

  return (
    <div className="p-3 rounded-[14px] bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {formattedValue}
          </p>
          {item.change && (
            <div className="flex items-center gap-1 mt-1">
              {item.change.type === 'increase' && <ArrowUp size={12} className="text-green-500" />}
              {item.change.type === 'decrease' && <ArrowDown size={12} className="text-red-500" />}
              {item.change.type === 'neutral' && <Minus size={12} className="text-gray-400" />}
              <span
                className={cn(
                  'text-xs font-medium',
                  item.change.type === 'increase' && 'text-green-600',
                  item.change.type === 'decrease' && 'text-red-600',
                  item.change.type === 'neutral' && 'text-gray-500',
                )}
              >
                {item.change.value > 0 ? '+' : ''}
                {item.change.value}%
              </span>
              {item.change.period && (
                <span className="text-xs text-gray-400">{item.change.period}</span>
              )}
            </div>
          )}
        </div>
        {item.icon && (
          <div className="p-2 rounded-[12px] bg-primary/10">
            <RenderIcon icon={item.icon} size={16} className="text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SummarySectionRenderer({ section }: { section: SummarySection }) {
  const gridClass = useMemo(() => {
    if (section.layout === 'list') return 'space-y-2';
    const cols = section.columns || 2;
    return cn(
      'grid gap-2',
      cols === 1 && 'grid-cols-1',
      cols === 2 && 'grid-cols-2',
      cols === 3 && 'grid-cols-3',
    );
  }, [section.layout, section.columns]);

  return (
    <SectionWrapper section={section}>
      <div className={gridClass}>
        {section.items.map(item => (
          <SummaryItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Metrics Section (with Charts)
// ============================================================================

function ChartItemComponent({ item }: { item: ChartItem }) {
  // Simple progress bar renderer
  if (item.type === 'progress') {
    const value = Array.isArray(item.data) && typeof item.data[0] === 'number' ? item.data[0] : 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
          <span className="text-sm text-gray-500">{value}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, value))}%`,
              backgroundColor: item.color || 'var(--primary)',
            }}
          />
        </div>
      </div>
    );
  }

  // Simple sparkline renderer
  if (item.type === 'sparkline' && Array.isArray(item.data)) {
    const numericData = item.data.filter((d): d is number => typeof d === 'number');
    const max = Math.max(...numericData, 1);
    const min = Math.min(...numericData, 0);
    const range = max - min || 1;
    const height = item.height || 40;

    return (
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
        <svg
          width="100%"
          height={height}
          className="overflow-visible"
          aria-label={item.title}
          role="img"
        >
          <polyline
            fill="none"
            stroke={item.color || 'var(--primary)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={numericData
              .map((d, i) => {
                const x = (i / (numericData.length - 1)) * 100;
                const y = height - ((d - min) / range) * height;
                return `${x}%,${y}`;
              })
              .join(' ')}
          />
        </svg>
      </div>
    );
  }

  // Custom renderer
  if (item.type === 'custom' && item.customRenderer) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
        {item.customRenderer(item.data)}
      </div>
    );
  }

  return null;
}

function isChartItem(item: SummaryItem | ChartItem): item is ChartItem {
  return 'type' in item && typeof (item as ChartItem).data !== 'undefined';
}

export function MetricsSectionRenderer({ section }: { section: MetricsSection }) {
  return (
    <SectionWrapper section={section}>
      <div className="space-y-4">
        {section.items.map(item =>
          isChartItem(item) ? (
            <ChartItemComponent key={item.id} item={item} />
          ) : (
            <SummaryItemComponent key={item.id} item={item} />
          ),
        )}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Actions Section
// ============================================================================

function ActionItemComponent({ item }: { item: ActionItem }) {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <button
      type="button"
      onClick={item.onClick}
      disabled={item.disabled || item.loading}
      title={item.tooltip}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[14px] font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        ACTION_VARIANTS[item.variant || 'secondary'],
        sizeClasses[item.size || 'md'],
      )}
    >
      {item.loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        item.icon && <RenderIcon icon={item.icon} size={16} />
      )}
      <span>{item.label}</span>
    </button>
  );
}

export function ActionsSectionRenderer({ section }: { section: ActionsSection }) {
  const layoutClass = useMemo(() => {
    switch (section.layout) {
      case 'horizontal':
        return 'flex flex-wrap gap-2';
      case 'grid':
        return 'grid grid-cols-2 gap-2';
      default:
        return 'flex flex-col gap-2';
    }
  }, [section.layout]);

  return (
    <SectionWrapper section={section}>
      <div className={layoutClass}>
        {section.items.map(item => (
          <ActionItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Settings Section
// ============================================================================

function isToggleItem(item: SettingsToggleItem | SettingsSelectItem): item is SettingsToggleItem {
  return 'checked' in item;
}

function SettingsToggleComponent({ item }: { item: SettingsToggleItem }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {item.icon && <RenderIcon icon={item.icon} size={16} className="text-gray-400" />}
        <div className="min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block truncate">
            {item.label}
          </span>
          {item.description && (
            <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
              {item.description}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={item.checked}
        onClick={() => !item.disabled && item.onChange(!item.checked)}
        disabled={item.disabled}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          item.checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            'translate-y-0.5',
            item.checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

function SettingsSelectComponent({ item }: { item: SettingsSelectItem }) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-1.5">
        {item.icon && <RenderIcon icon={item.icon} size={16} className="text-gray-400" />}
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
      </div>
      {item.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.description}</p>
      )}
      <select
        value={item.value}
        onChange={e => item.onChange(e.target.value)}
        disabled={item.disabled}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-[14px] border border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {item.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsSectionRenderer({ section }: { section: SettingsSection }) {
  return (
    <SectionWrapper section={section}>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {section.items.map(item =>
          isToggleItem(item) ? (
            <SettingsToggleComponent key={item.id} item={item} />
          ) : (
            <SettingsSelectComponent key={item.id} item={item} />
          ),
        )}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Error Section
// ============================================================================

const ERROR_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: AlertCircle,
};

const ERROR_COLORS = {
  info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
  error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  critical: 'border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-900/30',
};

const ERROR_ICON_COLORS = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  critical: 'text-red-600',
};

function ErrorItemComponent({ item }: { item: ErrorItem }) {
  const IconComponent = ERROR_ICONS[item.severity];

  return (
    <div className={cn('p-3 rounded-[14px] border', ERROR_COLORS[item.severity])}>
      <div className="flex items-start gap-3">
        <IconComponent
          size={18}
          className={cn('shrink-0 mt-0.5', ERROR_ICON_COLORS[item.severity])}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
            {item.dismissible && item.onDismiss && (
              <button
                type="button"
                onClick={item.onDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.message}</p>
          {item.action && (
            <button
              type="button"
              onClick={item.action.onClick}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              {item.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ErrorSectionRenderer({ section }: { section: ErrorSection }) {
  const displayItems = section.maxItems ? section.items.slice(0, section.maxItems) : section.items;

  return (
    <SectionWrapper section={section}>
      <div className="space-y-2">
        {displayItems.map(item => (
          <ErrorItemComponent key={item.id} item={item} />
        ))}
        {section.maxItems && section.items.length > section.maxItems && (
          <p className="text-xs text-gray-500 text-center py-1">
            +{section.items.length - section.maxItems} more
          </p>
        )}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Chart Section
// ============================================================================

export function ChartSectionRenderer({ section }: { section: ChartSection }) {
  return (
    <SectionWrapper section={section}>
      <div className="space-y-4">
        {section.items.map(item => (
          <ChartItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Custom Section
// ============================================================================

export function CustomSectionRenderer({ section }: { section: CustomSection }) {
  return <SectionWrapper section={section}>{section.render()}</SectionWrapper>;
}

// ============================================================================
// Main Section Renderer
// ============================================================================

export function SectionRenderer({ section }: { section: SidePanelSection }) {
  switch (section.type) {
    case 'navigation':
      return <NavigationSectionRenderer section={section} />;
    case 'status':
      return <StatusSectionRenderer section={section} />;
    case 'summary':
      return <SummarySectionRenderer section={section} />;
    case 'metrics':
      return <MetricsSectionRenderer section={section} />;
    case 'actions':
      return <ActionsSectionRenderer section={section} />;
    case 'settings':
      return <SettingsSectionRenderer section={section} />;
    case 'error':
      return <ErrorSectionRenderer section={section} />;
    case 'chart':
      return <ChartSectionRenderer section={section} />;
    case 'custom':
      return <CustomSectionRenderer section={section} />;
    default:
      return null;
  }
}
