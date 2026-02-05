'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  SidePanelContextState,
  SidePanelPageConfig,
  SidePanelPosition,
  SidePanelProviderProps,
  SidePanelWidth,
} from './types';

// ============================================================================
// Context
// ============================================================================

const SidePanelContext = createContext<SidePanelContextState | undefined>(undefined);

// ============================================================================
// Storage Keys
// ============================================================================

const DEFAULT_STORAGE_KEY = 'side-panel-state';

interface PersistedState {
  isCollapsed: boolean;
  width: SidePanelWidth;
  position: SidePanelPosition;
  collapsedSections: string[];
}

// ============================================================================
// Provider Component
// ============================================================================

export function SidePanelProvider({
  children,
  defaultWidth = 'md',
  defaultPosition = 'right',
  defaultCollapsed = false,
  checkPermission,
  persistState = true,
  storageKey = DEFAULT_STORAGE_KEY,
}: SidePanelProviderProps) {
  // Initialize state from localStorage or defaults
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !persistState) return defaultCollapsed;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        return parsed.isCollapsed ?? defaultCollapsed;
      }
    } catch {
      // Ignore parse errors
    }
    return defaultCollapsed;
  });

  const [width, setWidth] = useState<SidePanelWidth>(() => {
    if (typeof window === 'undefined' || !persistState) return defaultWidth;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        return parsed.width ?? defaultWidth;
      }
    } catch {
      // Ignore parse errors
    }
    return defaultWidth;
  });

  const [position, setPosition] = useState<SidePanelPosition>(() => {
    if (typeof window === 'undefined' || !persistState) return defaultPosition;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        return parsed.position ?? defaultPosition;
      }
    } catch {
      // Ignore parse errors
    }
    return defaultPosition;
  });

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    if (typeof window === 'undefined' || !persistState) return new Set();
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        return new Set(parsed.collapsedSections ?? []);
      }
    } catch {
      // Ignore parse errors
    }
    return new Set();
  });

  const [config, setConfig] = useState<SidePanelPageConfig | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !persistState) return;

    const state: PersistedState = {
      isCollapsed,
      width,
      position,
      collapsedSections: Array.from(collapsedSections),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }, [isCollapsed, width, position, collapsedSections, persistState, storageKey]);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Set collapsed state
  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
  }, []);

  // Toggle section collapsed state
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Check permission
  const hasPermission = useCallback(
    (permission: string) => {
      if (!checkPermission) return true;
      return checkPermission(permission);
    },
    [checkPermission]
  );

  // Memoize context value
  const contextValue = useMemo<SidePanelContextState>(
    () => ({
      isCollapsed,
      toggleCollapsed,
      setCollapsed,
      width,
      setWidth,
      position,
      setPosition,
      config,
      setConfig,
      collapsedSections,
      toggleSection,
      hasPermission,
    }),
    [
      isCollapsed,
      toggleCollapsed,
      setCollapsed,
      width,
      setWidth,
      position,
      setPosition,
      config,
      collapsedSections,
      toggleSection,
      hasPermission,
    ]
  );

  return (
    <SidePanelContext.Provider value={contextValue}>
      {children}
    </SidePanelContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useSidePanel(): SidePanelContextState {
  const context = useContext(SidePanelContext);
  if (context === undefined) {
    throw new Error('useSidePanel must be used within a SidePanelProvider');
  }
  return context;
}

// ============================================================================
// Optional Hook (returns null if not in provider)
// ============================================================================

export function useSidePanelOptional(): SidePanelContextState | null {
  return useContext(SidePanelContext) ?? null;
}
