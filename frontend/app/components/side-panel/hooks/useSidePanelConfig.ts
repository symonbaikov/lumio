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
  const context = useSidePanel();
  const [localConfig, setLocalConfig] = useState<SidePanelPageConfig>(initialConfig);

  useEffect(() => {
    setLocalConfig(prev => (prev === initialConfig ? prev : initialConfig));
  }, [initialConfig, ...dependencies]);

  // Sync with context on mount and when config changes
  useEffect(() => {
    if (autoRegister) {
      context.setConfig(localConfig);
    }
    return () => {
      if (autoRegister) {
        context.setConfig(null);
      }
    };
  }, [autoRegister, context, localConfig]);

  // Update the entire configuration
  const updateConfig = useCallback((newConfig: SidePanelPageConfig) => {
    setLocalConfig(newConfig);
  }, []);

  // Update a specific section
  const updateSection = useCallback(
    (sectionId: string, updates: Partial<SidePanelSection>) => {
      setLocalConfig(prev => ({
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section
        ) as SidePanelSection[],
      }));
    },
    []
  );

  // Add a new section
  const addSection = useCallback((section: SidePanelSection, index?: number) => {
    setLocalConfig(prev => {
      const newSections = [...prev.sections];
      if (index !== undefined && index >= 0 && index <= newSections.length) {
        newSections.splice(index, 0, section);
      } else {
        newSections.push(section);
      }
      return { ...prev, sections: newSections };
    });
  }, []);

  // Remove a section
  const removeSection = useCallback((sectionId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId),
    }));
  }, []);

  // Toggle section visibility
  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, hidden: !section.hidden } : section
      ) as SidePanelSection[],
    }));
  }, []);

  // Set section loading state
  const setSectionLoading = useCallback((sectionId: string, loading: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, className: loading ? 'opacity-50 pointer-events-none' : '' }
          : section
      ) as SidePanelSection[],
    }));
  }, []);

  return useMemo(
    () => ({
      config: localConfig,
      updateConfig,
      updateSection,
      addSection,
      removeSection,
      toggleSectionVisibility,
      setSectionLoading,
    }),
    [
      localConfig,
      updateConfig,
      updateSection,
      addSection,
      removeSection,
      toggleSectionVisibility,
      setSectionLoading,
    ]
  );
}

/**
 * Simple hook to get the current side panel config from context
 */
export function useCurrentSidePanelConfig(): SidePanelPageConfig | null {
  const context = useSidePanel();
  return context.config;
}
