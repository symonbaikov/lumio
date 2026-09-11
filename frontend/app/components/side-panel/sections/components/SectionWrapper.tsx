'use client';

import React from 'react';
import { ChevronDown } from '@/app/components/icons';
import { useSidePanel } from '../../SidePanelContext';
import type { SidePanelSection } from '../../types';
import { RenderIcon } from './RenderIcon';

/** Section wrapper with optional collapse */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function, complexity
export function SectionWrapper({
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
    <div style={{ marginBottom: 4 }} className={section.className}>
      {section.title && (
        <button
          type="button"
          onClick={() => section.collapsible && toggleSection(section.id)}
          disabled={!section.collapsible}
          className={section.titleClassName}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            marginTop: section.collapsible ? 12 : 4,
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--muted-foreground)',
            background: 'none',
            border: 'none',
            cursor: section.collapsible ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {section.icon && <RenderIcon icon={section.icon} size={14} />}
            <span>{section.title}</span>
          </div>
          {section.collapsible && (
            <ChevronDown
              size={14}
              style={{
                transition: 'transform 200ms',
                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </button>
      )}
      <div
        style={{
          transition: 'all 200ms',
          overflow: 'hidden',
          maxHeight: isCollapsed ? 0 : 2000,
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        <div
          style={{ padding: section.title ? '0 16px 12px' : '12px 16px' }}
          className={section.contentClassName}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
