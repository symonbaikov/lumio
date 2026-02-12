'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSidePanel } from '../SidePanelContext';
import type { SidePanelPageConfig, SidePanelSection } from '../types';

interface UseSidePanelConfigOptions {
  /** Initial configuration */
  config: SidePanelPageConfig;
  /** Whether to auto-register config on mount */
  autoRegister?: boolean;
  /** Dependencies that should trigger config update */
  dependencies?: unknown[];
}

interface UseSidePanelConfigReturn {
  /** Current configuration */
  config: SidePanelPageConfig;
  /** Update the entire configuration */
  updateConfig: (config: SidePanelPageConfig) => void;
  /** Update a specific section */
  updateSection: (sectionId: string, updates: Partial<SidePanelSection>) => void;
  /** Add a new section */
  addSection: (section: SidePanelSection, index?: number) => void;
  /** Remove a section */
  removeSection: (sectionId: string) => void;
  /** Toggle section visibility */
  toggleSectionVisibility: (sectionId: string) => void;
  /** Set section loading state (for async sections) */
  setSectionLoading: (sectionId: string, loading: boolean) => void;
}

/**
 * Hook for managing side panel configuration at the page level.
 * Provides utilities for updating, adding, and removing sections dynamically.
 */
export function useSidePanelConfig({
  config: initialConfig,
  autoRegister = true,
  dependencies = [],
}: UseSidePanelConfigOptions): UseSidePanelConfigReturn {
  const { setConfig } = useSidePanel();
  const [localConfig, setLocalConfig] = useState<SidePanelPageConfig | null>(null);
  const resolvedConfig = localConfig ?? initialConfig;

  useEffect(() => {
    if (localConfig && localConfig.pageId !== initialConfig.pageId) {
      setLocalConfig(null);
    }
  }, [initialConfig.pageId, localConfig]);

  // Sync with context when config changes.
  useEffect(() => {
    if (autoRegister) {
      setConfig(resolvedConfig);
    }
  }, [autoRegister, resolvedConfig, setConfig, ...dependencies]);

  // Clear config only when the registrar unmounts.
  useEffect(() => {
    return () => {
      if (autoRegister) {
        setConfig(null);
      }
    };
  }, [autoRegister, setConfig]);

  // Update the entire configuration
  const updateConfig = useCallback((newConfig: SidePanelPageConfig) => {
    setLocalConfig(newConfig);
  }, []);

  // Update a specific section
  const updateSection = useCallback(
    (sectionId: string, updates: Partial<SidePanelSection>) => {
      setLocalConfig(prev => ({
        ...(prev ?? initialConfig),
        sections: (prev ?? initialConfig).sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section,
        ) as SidePanelSection[],
      }));
    },
    [initialConfig],
  );

  // Add a new section
  const addSection = useCallback(
    (section: SidePanelSection, index?: number) => {
      setLocalConfig(prev => {
        const baseConfig = prev ?? initialConfig;
        const newSections = [...baseConfig.sections];
        if (index !== undefined && index >= 0 && index <= newSections.length) {
          newSections.splice(index, 0, section);
        } else {
          newSections.push(section);
        }
        return { ...baseConfig, sections: newSections };
      });
    },
    [initialConfig],
  );

  // Remove a section
  const removeSection = useCallback(
    (sectionId: string) => {
      setLocalConfig(prev => ({
        ...(prev ?? initialConfig),
        sections: (prev ?? initialConfig).sections.filter(section => section.id !== sectionId),
      }));
    },
    [initialConfig],
  );

  // Toggle section visibility
  const toggleSectionVisibility = useCallback(
    (sectionId: string) => {
      setLocalConfig(prev => ({
        ...(prev ?? initialConfig),
        sections: (prev ?? initialConfig).sections.map(section =>
          section.id === sectionId ? { ...section, hidden: !section.hidden } : section,
        ) as SidePanelSection[],
      }));
    },
    [initialConfig],
  );

  // Set section loading state
  const setSectionLoading = useCallback(
    (sectionId: string, loading: boolean) => {
      setLocalConfig(prev => ({
        ...(prev ?? initialConfig),
        sections: (prev ?? initialConfig).sections.map(section =>
          section.id === sectionId
            ? { ...section, className: loading ? 'opacity-50 pointer-events-none' : '' }
            : section,
        ) as SidePanelSection[],
      }));
    },
    [initialConfig],
  );

  return useMemo(
    () => ({
      config: resolvedConfig,
      updateConfig,
      updateSection,
      addSection,
      removeSection,
      toggleSectionVisibility,
      setSectionLoading,
    }),
    [
      resolvedConfig,
      updateConfig,
      updateSection,
      addSection,
      removeSection,
      toggleSectionVisibility,
      setSectionLoading,
    ],
  );
}

/**
 * Simple hook to get the current side panel config from context
 */
export function useCurrentSidePanelConfig(): SidePanelPageConfig | null {
  const context = useSidePanel();
  return context.config;
}
