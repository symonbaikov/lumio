'use client';

import { cn } from '@/app/lib/utils';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
} from 'lucide-react';
import React, { isValidElement, useCallback, useMemo, useState } from 'react';
import { useSidePanel } from './SidePanelContext';
import { SectionRenderer } from './sections';
import type { ActionItem, SidePanelProps } from './types';
import { getWidthValue } from './types';

// ============================================================================
// Helper Components
// ============================================================================

/** Render icon - handles both LucideIcon and ReactNode */
function RenderIcon({
  icon,
  className,
  size = 16,
}: {
  icon: ActionItem['icon'];
  className?: string;
  size?: number;
}) {
  if (!icon) return null;

  if (isValidElement(icon)) {
    return <span className={className}>{icon}</span>;
  }

  const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} className={className} />;
}

// ============================================================================
// Main Component
// ============================================================================

export function SidePanel({
  visible = true,
  width: propWidth,
  position: propPosition,
  defaultCollapsed,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  enabledSections,
  permissions,
  config,
  className,
  showCollapseToggle = true,
  collapseTogglePosition = 'header',
  loading = false,
  error = null,
  onRetry,
}: SidePanelProps) {
  const context = useSidePanel();

  // Use prop values or context values
  const width = propWidth ?? context.width;
  const position = propPosition ?? context.position;

  // Handle collapsed state - support both controlled and uncontrolled modes
  const isControlled = controlledCollapsed !== undefined;
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed ?? false);

  const isCollapsed = isControlled ? controlledCollapsed : uncontrolledCollapsed;

  const handleToggleCollapsed = useCallback(() => {
    if (isControlled) {
      onCollapsedChange?.(!controlledCollapsed);
    } else {
      setUncontrolledCollapsed(prev => !prev);
    }
  }, [isControlled, controlledCollapsed, onCollapsedChange]);

  // Calculate width value
  const widthValue = useMemo(() => getWidthValue(width), [width]);
  const collapsedWidth = 48; // Width when collapsed (just shows toggle)

  // Filter sections based on enabledSections and permissions
  const filteredSections = useMemo(() => {
    if (!config?.sections) return [];

    return config.sections.filter(section => {
      // Check if section is enabled
      if (enabledSections && !enabledSections.includes(section.id)) {
        return false;
      }

      // Check permissions
      if (permissions?.sections?.[section.id]) {
        const requiredPermissions = permissions.sections[section.id];
        const hasAllPermissions = requiredPermissions.every(p => context.hasPermission(p));
        if (!hasAllPermissions) return false;
      }

      return true;
    });
  }, [config?.sections, enabledSections, permissions, context]);

  // Check panel-level permissions
  const canViewPanel = useMemo(() => {
    if (!permissions?.viewPanel) return true;
    return permissions.viewPanel.every(p => context.hasPermission(p));
  }, [permissions?.viewPanel, context]);

  // Don't render if not visible or no permission
  if (!visible || !canViewPanel) return null;

  // Position classes
  const positionClasses = position === 'left' ? 'border-r' : 'border-l';

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out',
        'shadow-sm overflow-visible',
        positionClasses,
        className,
      )}
      style={{
        width: isCollapsed ? collapsedWidth : widthValue,
        minWidth: isCollapsed ? collapsedWidth : widthValue,
      }}
      data-side-panel
      data-position={position}
      data-collapsed={isCollapsed}
    >
      {/* Collapsed state - just show toggle button */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-4">
          {showCollapseToggle && (
            <button
              type="button"
              onClick={handleToggleCollapsed}
              className={cn(
                'p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
              )}
              aria-label="Expand panel"
            >
              {position === 'left' ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          {(config?.header || showCollapseToggle) && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
              {config?.header && (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {config.header.icon && (
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <RenderIcon icon={config.header.icon} size={18} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {config.header.title && (
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {config.header.title}
                      </h2>
                    )}
                    {config.header.subtitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {config.header.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {/* Header actions */}
                {config?.header?.actions?.map(action => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    title={action.tooltip || action.label}
                    className={cn(
                      'p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                      'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {action.loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RenderIcon icon={action.icon} size={16} />
                    )}
                  </button>
                ))}

                {/* Collapse toggle in header */}
                {showCollapseToggle && collapseTogglePosition === 'header' && (
                  <button
                    type="button"
                    onClick={handleToggleCollapsed}
                    className={cn(
                      'p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                      'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                    )}
                    aria-label="Collapse panel"
                  >
                    {position === 'left' ? (
                      <PanelLeftClose size={16} />
                    ) : (
                      <PanelLeftOpen size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center mb-1">
                  Error loading content
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">{error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg',
                      'text-primary bg-primary/10 hover:bg-primary/20 transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20',
                    )}
                  >
                    <RefreshCw size={14} />
                    Retry
                  </button>
                )}
              </div>
            ) : filteredSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  No content available
                </p>
              </div>
            ) : (
              filteredSections.map(section => (
                <SectionRenderer key={section.id} section={section} />
              ))
            )}
          </div>

          {/* Footer */}
          {config?.footer && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0 overflow-visible">
              {config.footer.content}
              {config.footer.actions && config.footer.actions.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {config.footer.actions.map(action => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      disabled={action.disabled || action.loading}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg',
                        'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        action.variant === 'primary'
                          ? 'bg-primary text-white hover:bg-primary-hover'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                      )}
                    >
                      {action.loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        action.icon && <RenderIcon icon={action.icon} size={14} />
                      )}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edge collapse toggle */}
          {showCollapseToggle && collapseTogglePosition === 'edge' && (
            <button
              type="button"
              onClick={handleToggleCollapsed}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 p-1 rounded-full',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                'shadow-sm hover:shadow transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                position === 'left' ? '-right-3' : '-left-3',
              )}
              aria-label="Collapse panel"
            >
              {position === 'left' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </>
      )}
    </aside>
  );
}

export default SidePanel;
