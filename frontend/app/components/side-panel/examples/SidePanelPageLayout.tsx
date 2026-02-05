'use client';

import { cn } from '@/app/lib/utils';
import React, { useMemo, useState } from 'react';
import { SidePanel, SidePanelProvider } from '../index';
import { createBasicSidePanelConfig } from '../configs';
import type { SidePanelPageConfig, SidePanelPosition, SidePanelWidth } from '../types';

// ============================================================================
// Page Layout with Side Panel
// ============================================================================

interface PageWithSidePanelProps {
  children: React.ReactNode;
  /** Side panel configuration */
  sidePanelConfig: SidePanelPageConfig;
  /** Panel visibility */
  showSidePanel?: boolean;
  /** Panel width */
  sidePanelWidth?: SidePanelWidth;
  /** Panel position */
  sidePanelPosition?: SidePanelPosition;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Enabled section IDs */
  enabledSections?: string[];
  /** Additional class for main content */
  contentClassName?: string;
  /** Additional class for container */
  className?: string;
}

/**
 * A reusable page layout component that includes a side panel.
 * Wraps content with the side panel and provides proper flex layout.
 */
export function PageWithSidePanel({
  children,
  sidePanelConfig,
  showSidePanel = true,
  sidePanelWidth = 'md',
  sidePanelPosition = 'right',
  defaultCollapsed = false,
  enabledSections,
  contentClassName,
  className,
}: PageWithSidePanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-var(--global-nav-height,0px))]',
        sidePanelPosition === 'left' && 'flex-row-reverse',
        className
      )}
    >
      {/* Main Content */}
      <main className={cn('flex-1 min-w-0 overflow-auto', contentClassName)}>
        {children}
      </main>

      {/* Side Panel */}
      {showSidePanel && (
        <SidePanel
          config={sidePanelConfig}
          width={sidePanelWidth}
          position={sidePanelPosition}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          enabledSections={enabledSections}
          showCollapseToggle
          collapseTogglePosition="header"
        />
      )}
    </div>
  );
}

// ============================================================================
// Example: Statements Page with Side Panel
// ============================================================================

export function StatementsPageExample() {
  // Simulated state - in real app, this would come from API/context
  const [statusFilter] = useState('');

  // Create configuration with current state
  const sidePanelConfig = useMemo(
    () =>
      createBasicSidePanelConfig({
        pageId: 'statements',
        title: 'Statements',
        subtitle: 'Overview',
      }),
    []
  );

  return (
    <PageWithSidePanel sidePanelConfig={sidePanelConfig} sidePanelWidth="md">
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-6">Statements</h1>
        <p className="text-gray-600">
          Current filter: {statusFilter || 'All'}
        </p>
        {/* Rest of page content */}
      </div>
    </PageWithSidePanel>
  );
}

// ============================================================================
// Example: Reports Page with Side Panel
// ============================================================================

export function ReportsPageExample() {
  const [activeTab, setActiveTab] = useState('sheets');

  const sidePanelConfig = useMemo(
    () =>
      createBasicSidePanelConfig({
        pageId: 'reports',
        title: 'Reports',
        subtitle: `Overview - ${activeTab}`,
      }),
    [activeTab]
  );

  return (
    <PageWithSidePanel
      sidePanelConfig={sidePanelConfig}
      sidePanelWidth="lg"
      sidePanelPosition="right"
    >
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-6">Reports - {activeTab}</h1>
        {/* Rest of page content */}
      </div>
    </PageWithSidePanel>
  );
}

// ============================================================================
// Example: Storage Page with Side Panel
// ============================================================================

export function StoragePageExample() {
  const [activeFolderId, setActiveFolderId] = useState('');

  const sidePanelConfig = useMemo(
    () =>
      createBasicSidePanelConfig({
        pageId: 'storage',
        title: 'Storage',
        subtitle: activeFolderId ? `Folder ${activeFolderId}` : 'Overview',
      }),
    [activeFolderId]
  );

  return (
    <PageWithSidePanel
      sidePanelConfig={sidePanelConfig}
      sidePanelWidth="md"
      defaultCollapsed={false}
    >
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-6">Storage</h1>
        <p className="text-gray-600">
          Active folder: {activeFolderId || 'All Files'}
        </p>
        {/* Rest of page content */}
      </div>
    </PageWithSidePanel>
  );
}

// ============================================================================
// Example: Settings Page with Side Panel on Left
// ============================================================================

export function SettingsPageExample() {
  const [activeSection, setActiveSection] = useState('profile');
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: false,
    darkMode: false,
    language: 'en',
    twoFactor: false,
  });

  const sidePanelConfig = useMemo(
    () =>
      createBasicSidePanelConfig({
        pageId: 'settings',
        title: 'Settings',
        subtitle: activeSection,
      }),
    [activeSection]
  );

  return (
    <PageWithSidePanel
      sidePanelConfig={sidePanelConfig}
      sidePanelWidth="sm"
      sidePanelPosition="left"
    >
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-6">Settings - {activeSection}</h1>
        {/* Rest of page content based on activeSection */}
      </div>
    </PageWithSidePanel>
  );
}

// ============================================================================
// Full App Layout Example with Provider
// ============================================================================

interface AppLayoutWithSidePanelProps {
  children: React.ReactNode;
}

/**
 * Example of how to wrap the entire app with the SidePanelProvider.
 * This should be added to the app's providers or layout.
 */
export function AppLayoutWithSidePanel({ children }: AppLayoutWithSidePanelProps) {
  // Optional: Get user permissions from auth context
  const checkPermission = (permission: string) => {
    // In a real app, check against user's permissions
    const userPermissions = ['statement.view', 'storage.view', 'reports.view'];
    return userPermissions.includes(permission);
  };

  return (
    <SidePanelProvider
      defaultWidth="md"
      defaultPosition="right"
      defaultCollapsed={false}
      checkPermission={checkPermission}
      persistState={true}
      storageKey="app-side-panel"
    >
      {children}
    </SidePanelProvider>
  );
}
